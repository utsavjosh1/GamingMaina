-- Application authorization is handled by Better Auth + server-side Drizzle.
-- The Data API is denied access to these tables; only the server connection may
-- read/write them. Better Auth creates the user and this trigger creates the
-- application profile in the same database transaction.

ALTER TABLE public.stations
  ADD CONSTRAINT stations_current_session_fk
  FOREIGN KEY (current_session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'staff', 'admin'));
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_check
  CHECK (membership_type IN ('none', 'silver', 'gold', 'platinum'));
ALTER TABLE public.stations
  ADD CONSTRAINT stations_status_check
  CHECK (status IN ('available', 'booked', 'in_use', 'maintenance', 'offline'));
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'expired'));
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_duration_check CHECK (duration_hours > 0);
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_time_check CHECK (end_time > start_time);
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('active', 'paused', 'completed', 'force_ended'));
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check CHECK (payment_status IN ('pending', 'paid', 'void'));
ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_check CHECK (amount > 0);
ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check CHECK (payment_method IS NULL OR payment_method IN ('cash', 'upi', 'card', 'membership_credit'));
ALTER TABLE public.pricing_rules
  ADD CONSTRAINT pricing_rule_type_check
  CHECK (rule_type IN ('happy_hour', 'membership_discount', 'package', 'minute_rate'));

CREATE INDEX bookings_user_idx ON public.bookings(user_id);
CREATE INDEX bookings_date_idx ON public.bookings(booking_date);
CREATE INDEX bookings_status_idx ON public.bookings(status);
CREATE INDEX stations_type_idx ON public.stations(station_type_id);
CREATE INDEX stations_status_idx ON public.stations(status);
CREATE INDEX sessions_station_idx ON public.sessions(station_id);
CREATE INDEX sessions_status_idx ON public.sessions(status);
CREATE INDEX payments_booking_idx ON public.payments(booking_id);
CREATE INDEX payments_session_idx ON public.payments(session_id);
CREATE INDEX audit_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX audit_created_idx ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.name, NEW.image)
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON public."user";
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON public."user"
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- All application queries use the private DATABASE_URL connection. Deny the
-- browser roles so an exposed Data API cannot bypass server authorization.
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."user", public."session", public."account", public."verification",
  public.profiles, public.station_types, public.stations, public.bookings,
  public.sessions, public.pricing_rules, public.payments, public.audit_logs
FROM anon, authenticated;
