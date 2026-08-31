-- Security, booking allocation, and staff-operation hardening.
-- This migration is intentionally transactional: all state transitions happen
-- in PostgreSQL rather than in separate client requests.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid'
    CHECK (payment_status IN ('pending', 'paid', 'void'));
ALTER TABLE public.payments ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN collected_by DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_amount_check CHECK (amount > 0);

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())), 'customer');
$$;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- A customer may edit their contact details, never their authorization or
-- membership fields. Admin changes remain possible through the admin policy.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.membership_type IS DISTINCT FROM NEW.membership_type)
     AND public.get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only an administrator can change profile privileges';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_change();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update safe profile fields"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Audit triggers run as the owner so RLS on the append-only log cannot make a
-- legitimate station/payment mutation fail.
CREATE OR REPLACE FUNCTION public.audit_station_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES ((SELECT auth.uid()), 'station.status_changed', 'station', NEW.id,
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_payment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (COALESCE(NEW.collected_by, (SELECT auth.uid())), 'payment.created', 'payment', NEW.id,
    jsonb_build_object('amount', NEW.amount, 'method', NEW.payment_method, 'status', NEW.payment_status));
  RETURN NEW;
END;
$$;

-- Narrow public availability functions; station IDs, internal status, and
-- current_session_id are no longer exposed to anonymous clients.
CREATE OR REPLACE FUNCTION public.get_station_type_availability()
RETURNS TABLE (
  id UUID, name TEXT, category TEXT, base_price_per_hour INT,
  image_url TEXT, created_at TIMESTAMPTZ, available BIGINT, total BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT t.id, t.name, t.category, t.base_price_per_hour, t.image_url, t.created_at,
    COUNT(s.id) FILTER (WHERE s.status = 'available') AS available,
    COUNT(s.id) FILTER (WHERE s.status IN ('available', 'booked')) AS total
  FROM public.station_types t
  LEFT JOIN public.stations s ON s.station_type_id = t.id
  GROUP BY t.id
  ORDER BY t.name;
$$;

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_station_type_id UUID,
  p_date DATE,
  p_duration_hours INT DEFAULT 1
)
RETURNS TABLE (start_time TIME, end_time TIME, available BIGINT, total BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  hour_value INT;
  slot_start TIME;
  slot_end TIME;
  station_total BIGINT;
  booking_count BIGINT;
BEGIN
  IF p_date < ((now() AT TIME ZONE 'Asia/Kolkata')::date) THEN RAISE EXCEPTION 'Invalid date'; END IF;
  IF p_duration_hours < 1 OR p_duration_hours > 5 THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  SELECT COUNT(*) INTO station_total FROM public.stations
    WHERE station_type_id = p_station_type_id AND status IN ('available', 'booked');
  IF station_total = 0 THEN RETURN; END IF;

  FOR hour_value IN 10..(23 - p_duration_hours) LOOP
    slot_start := make_time(hour_value, 0, 0);
    slot_end := make_time(hour_value + p_duration_hours, 0, 0);
    IF p_date = ((now() AT TIME ZONE 'Asia/Kolkata')::date)
       AND slot_start <= (now() AT TIME ZONE 'Asia/Kolkata')::time THEN CONTINUE; END IF;
    SELECT COUNT(*) INTO booking_count FROM public.bookings
      WHERE station_type_id = p_station_type_id AND booking_date = p_date
        AND status IN ('confirmed', 'checked_in')
        AND start_time < slot_end AND end_time > slot_start;
    start_time := slot_start; end_time := slot_end;
    available := GREATEST(station_total - booking_count, 0); total := station_total;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_station_type_availability() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots(UUID, DATE, INT) TO authenticated;

-- Customers cannot write booking rows directly; cancellation is also a
-- constrained server-side operation.
DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users cancel own bookings" ON public.bookings;
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE changed BOOLEAN;
BEGIN
  UPDATE public.bookings SET status = 'cancelled'
    WHERE id = p_booking_id AND user_id = (SELECT auth.uid()) AND status = 'confirmed'
    RETURNING TRUE INTO changed;
  IF changed IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Booking cannot be cancelled'; END IF;
  RETURN TRUE;
END; $$;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID) TO authenticated;

-- Authoritative booking price and allocation. The advisory lock serializes
-- bookings for a station type/day, eliminating the count-then-insert race.
CREATE OR REPLACE FUNCTION public.create_booking(
  p_station_type_id UUID, p_booking_date DATE, p_start_time TIME, p_duration_hours NUMERIC
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  station_total INT;
  booking_count INT;
  end_value TIME;
  base_price INT;
  member_type TEXT;
  total NUMERIC;
  package_price INT;
  discount INT;
  day_name TEXT := lower(to_char(p_booking_date, 'Dy'));
  rule RECORD;
  result public.bookings;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_booking_date < ((now() AT TIME ZONE 'Asia/Kolkata')::date)
     OR (p_booking_date = ((now() AT TIME ZONE 'Asia/Kolkata')::date)
         AND p_start_time <= (now() AT TIME ZONE 'Asia/Kolkata')::time)
     OR p_duration_hours < 1 OR p_duration_hours > 5
     OR p_duration_hours <> trunc(p_duration_hours)
     OR extract(minute FROM p_start_time) <> 0
     OR p_start_time < time '10:00' THEN
    RAISE EXCEPTION 'Invalid booking time';
  END IF;
  end_value := p_start_time + (p_duration_hours * interval '1 hour');
  IF end_value > time '23:00' OR end_value <= p_start_time THEN RAISE EXCEPTION 'Booking exceeds business hours'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_station_type_id::text || ':' || p_booking_date::text, 0));
  SELECT base_price_per_hour INTO base_price FROM public.station_types WHERE id = p_station_type_id;
  IF base_price IS NULL THEN RAISE EXCEPTION 'Station type not found'; END IF;
  SELECT COUNT(*) INTO station_total FROM public.stations
    WHERE station_type_id = p_station_type_id AND status IN ('available', 'booked');
  SELECT COUNT(*) INTO booking_count FROM public.bookings
    WHERE station_type_id = p_station_type_id AND booking_date = p_booking_date
      AND status IN ('confirmed', 'checked_in')
      AND start_time < end_value AND end_time > p_start_time;
  IF booking_count >= station_total THEN RAISE EXCEPTION 'No stations available for this time slot'; END IF;

  SELECT membership_type INTO member_type FROM public.profiles WHERE id = caller;
  total := base_price * p_duration_hours;

  SELECT fixed_price INTO package_price FROM public.pricing_rules
    WHERE is_active AND rule_type = 'package'
      AND (station_type_id IS NULL OR station_type_id = p_station_type_id)
      AND (conditions->>'min_hours')::numeric <= p_duration_hours
    ORDER BY priority DESC LIMIT 1;
  IF package_price IS NOT NULL THEN
    total := package_price;
  ELSE
    FOR rule IN SELECT * FROM public.pricing_rules
      WHERE is_active AND rule_type IN ('happy_hour', 'membership_discount')
        AND (station_type_id IS NULL OR station_type_id = p_station_type_id)
      ORDER BY priority DESC LOOP
      IF rule.rule_type = 'happy_hour'
        AND (rule.conditions->'days') ? day_name
        AND p_start_time >= (rule.conditions->>'start')::time
        AND p_start_time < (rule.conditions->>'end')::time THEN
        total := total - round(total * rule.discount_percent / 100.0);
      ELSIF rule.rule_type = 'membership_discount'
        AND member_type = rule.conditions->>'membership' THEN
        total := total - round(total * rule.discount_percent / 100.0);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.bookings (user_id, station_type_id, booking_date, start_time, end_time,
    duration_hours, estimated_price, status, expires_at)
  VALUES (caller, p_station_type_id, p_booking_date, p_start_time, end_value,
    p_duration_hours, GREATEST(round(total), 0)::int, 'confirmed',
    ((p_booking_date + p_start_time) AT TIME ZONE 'Asia/Kolkata') + interval '15 minutes')
  RETURNING * INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_booking(UUID, DATE, TIME, NUMERIC) TO authenticated;

-- Transactional session state machine.
DROP POLICY IF EXISTS "Staff full access sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff create payments" ON public.payments;

CREATE OR REPLACE FUNCTION public.update_station_status(p_station_id UUID, p_status TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE changed BOOLEAN;
BEGIN
  IF public.get_user_role() NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_status NOT IN ('available', 'maintenance', 'offline') THEN RAISE EXCEPTION 'Invalid station status'; END IF;
  UPDATE public.stations SET status = p_status
    WHERE id = p_station_id AND status <> 'in_use'
    RETURNING TRUE INTO changed;
  IF changed IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Station is busy or no longer exists'; END IF;
  RETURN TRUE;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_station_status(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_session(p_station_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS public.sessions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result public.sessions; station_status TEXT;
BEGIN
  IF public.get_user_role() NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT status INTO station_status FROM public.stations WHERE id = p_station_id FOR UPDATE;
  IF station_status IS NULL OR station_status <> 'available' THEN RAISE EXCEPTION 'Station is not available'; END IF;
  INSERT INTO public.sessions (station_id, user_id, started_by, status)
    VALUES (p_station_id, p_user_id, (SELECT auth.uid()), 'active') RETURNING * INTO result;
  UPDATE public.stations SET status = 'in_use', current_session_id = result.id WHERE id = p_station_id;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.pause_session(p_session_id UUID)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result public.sessions;
BEGIN
  IF public.get_user_role() NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.sessions SET status = 'paused', paused_at = now()
    WHERE id = p_session_id AND status = 'active' RETURNING * INTO result;
  IF result.id IS NULL THEN RAISE EXCEPTION 'Session is not active'; END IF;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.resume_session(p_session_id UUID)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result public.sessions; pause_minutes INT;
BEGIN
  IF public.get_user_role() NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT ceil(extract(epoch FROM (now() - paused_at)) / 60)::int INTO pause_minutes
    FROM public.sessions WHERE id = p_session_id AND status = 'paused' AND paused_at IS NOT NULL FOR UPDATE;
  IF pause_minutes IS NULL THEN RAISE EXCEPTION 'Session is not paused'; END IF;
  UPDATE public.sessions SET status = 'active', paused_at = NULL,
    total_paused_minutes = total_paused_minutes + pause_minutes
    WHERE id = p_session_id RETURNING * INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.end_session(p_session_id UUID)
RETURNS TABLE (session_id UUID, total_minutes INT, total_price INT, station_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE s public.sessions; station public.stations; type_price INT; pause_minutes INT; billable INT; charge INT;
  member_type TEXT; total NUMERIC; rule RECORD; package_price INT;
BEGIN
  IF public.get_user_role() NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO s FROM public.sessions WHERE id = p_session_id FOR UPDATE;
  IF s.id IS NULL OR s.status NOT IN ('active', 'paused') THEN RAISE EXCEPTION 'Session cannot be ended'; END IF;
  pause_minutes := s.total_paused_minutes + CASE WHEN s.paused_at IS NULL THEN 0 ELSE ceil(extract(epoch FROM (now() - s.paused_at)) / 60)::int END;
  billable := GREATEST(ceil(extract(epoch FROM (now() - s.started_at)) / 60)::int - pause_minutes, 0);
  SELECT st.* INTO station FROM public.stations st WHERE st.id = s.station_id;
  SELECT base_price_per_hour INTO type_price FROM public.station_types WHERE id = station.station_type_id;
  SELECT membership_type INTO member_type FROM public.profiles WHERE id = s.user_id;
  total := type_price * billable / 60.0;
  SELECT fixed_price INTO package_price FROM public.pricing_rules
    WHERE is_active AND rule_type = 'package'
      AND (station_type_id IS NULL OR station_type_id = station.station_type_id)
      AND (conditions->>'min_hours')::numeric <= billable / 60.0
    ORDER BY priority DESC LIMIT 1;
  IF package_price IS NOT NULL THEN
    total := package_price;
  ELSE
    FOR rule IN SELECT * FROM public.pricing_rules
      WHERE is_active AND rule_type IN ('happy_hour', 'membership_discount')
        AND (station_type_id IS NULL OR station_type_id = station.station_type_id)
      ORDER BY priority DESC LOOP
      IF rule.rule_type = 'happy_hour'
        AND (rule.conditions->'days') ? lower(to_char(now() AT TIME ZONE 'Asia/Kolkata', 'Dy'))
        AND (now() AT TIME ZONE 'Asia/Kolkata')::time >= (rule.conditions->>'start')::time
        AND (now() AT TIME ZONE 'Asia/Kolkata')::time < (rule.conditions->>'end')::time THEN
        total := total - round(total * rule.discount_percent / 100.0);
      ELSIF rule.rule_type = 'membership_discount' AND member_type = rule.conditions->>'membership' THEN
        total := total - round(total * rule.discount_percent / 100.0);
      END IF;
    END LOOP;
  END IF;
  charge := GREATEST(ceil(total)::int, 0);
  UPDATE public.sessions SET status = 'completed', ended_at = now(), paused_at = NULL, total_paused_minutes = pause_minutes WHERE id = s.id;
  UPDATE public.stations SET status = 'available', current_session_id = NULL WHERE id = s.station_id AND current_session_id = s.id;
  IF charge > 0 THEN
    INSERT INTO public.payments (session_id, booking_id, user_id, amount, payment_status, payment_method, collected_by, notes)
      VALUES (s.id, s.booking_id, s.user_id, charge, 'pending', NULL, NULL, 'Session charge awaiting collection');
  END IF;
  session_id := s.id; total_minutes := billable; total_price := charge; station_name := station.name; RETURN NEXT;
END; $$;
GRANT EXECUTE ON FUNCTION public.start_session(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.collect_payment(
  p_booking_id UUID DEFAULT NULL, p_session_id UUID DEFAULT NULL, p_user_id UUID DEFAULT NULL,
  p_amount INT DEFAULT NULL, p_method TEXT DEFAULT NULL, p_upi_reference TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE result public.payments; pending public.payments; expected INT; target_user UUID;
BEGIN
  IF public.get_user_role() NOT IN ('staff', 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_method NOT IN ('cash', 'upi', 'card') THEN RAISE EXCEPTION 'Invalid payment'; END IF;
  IF p_booking_id IS NOT NULL AND p_session_id IS NOT NULL THEN RAISE EXCEPTION 'Choose one payment reference'; END IF;
  IF p_booking_id IS NOT NULL THEN
    SELECT estimated_price, user_id INTO expected, target_user FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT amount, user_id INTO expected, target_user FROM public.payments WHERE session_id = p_session_id AND payment_status = 'pending' FOR UPDATE;
    IF expected IS NULL THEN RAISE EXCEPTION 'No pending session charge'; END IF;
  END IF;
  IF p_booking_id IS NOT NULL AND expected IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF (p_booking_id IS NOT NULL OR p_session_id IS NOT NULL) AND p_amount <> expected THEN RAISE EXCEPTION 'Payment amount does not match charge'; END IF;
  IF p_booking_id IS NOT NULL THEN
    SELECT * INTO pending FROM public.payments WHERE booking_id = p_booking_id AND payment_status = 'pending' FOR UPDATE;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT p.* INTO pending FROM public.payments p
      WHERE p.session_id = p_session_id AND p.payment_status = 'pending' FOR UPDATE;
  END IF;
  IF pending.id IS NOT NULL THEN
    UPDATE public.payments SET payment_status = 'paid', payment_method = p_method, collected_by = (SELECT auth.uid()), upi_reference = p_upi_reference, notes = p_notes WHERE id = pending.id RETURNING * INTO result;
  ELSE
    INSERT INTO public.payments (booking_id, session_id, user_id, amount, payment_status, payment_method, collected_by, upi_reference, notes)
      VALUES (p_booking_id, p_session_id, COALESCE(target_user, p_user_id), p_amount, 'paid', p_method, (SELECT auth.uid()), p_upi_reference, p_notes) RETURNING * INTO result;
  END IF;
  IF p_booking_id IS NOT NULL THEN UPDATE public.bookings SET status = 'completed' WHERE id = p_booking_id AND status IN ('confirmed', 'checked_in'); END IF;
  RETURN result;
END; $$;
GRANT EXECUTE ON FUNCTION public.collect_payment(UUID, UUID, UUID, INT, TEXT, TEXT, TEXT) TO authenticated;

-- Explicit WITH CHECK clauses prevent a role-authorized caller from changing
-- ownership or protected rows through direct PostgREST requests.
DROP POLICY IF EXISTS "Staff update bookings" ON public.bookings;
CREATE POLICY "Staff update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('staff', 'admin'))
  WITH CHECK (public.get_user_role() IN ('staff', 'admin'));
DROP POLICY IF EXISTS "Admin manage bookings" ON public.bookings;
CREATE POLICY "Admin manage bookings" ON public.bookings FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "Admin manage sessions" ON public.sessions;
CREATE POLICY "Admin manage sessions" ON public.sessions FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Staff mutations are exposed only through the checked, transactional RPCs.
DROP POLICY IF EXISTS "Staff can update stations" ON public.stations;
DROP POLICY IF EXISTS "Staff create payments" ON public.payments;

DROP POLICY IF EXISTS "Anyone can read stations" ON public.stations;
DROP POLICY IF EXISTS "Anon can read stations" ON public.stations;
-- Direct station reads are staff-only; customer availability uses the RPC.
CREATE POLICY "Staff can read stations" ON public.stations FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('staff', 'admin'));

-- Make old seed operations safe when a developer still runs seed.sql manually.
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['stations', 'sessions', 'bookings'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
