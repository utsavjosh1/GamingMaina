-- ============================================================
-- Gaming Mania Delhi — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. TABLES ───────────────────────────────────────────

-- Station Types (pricing templates)
CREATE TABLE IF NOT EXISTS station_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  base_price_per_hour INT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual Stations (physical machines/tables)
CREATE TABLE IF NOT EXISTS stations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_type_id UUID REFERENCES station_types(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'available'
    CHECK (status IN ('available','booked','in_use','maintenance','offline')),
  current_session_id UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer'
    CHECK (role IN ('customer','staff','admin')),
  membership_type TEXT DEFAULT 'none'
    CHECK (membership_type IN ('none','silver','gold','platinum')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings (advance reservations)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  station_type_id UUID REFERENCES station_types(id) ON DELETE CASCADE NOT NULL,
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  estimated_price INT NOT NULL,
  status TEXT DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','checked_in','completed','cancelled','no_show','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_negative_duration CHECK (duration_hours > 0),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Sessions (active play)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_paused_minutes INT DEFAULT 0,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','force_ended')),
  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK from stations to sessions (circular ref)
ALTER TABLE stations
  ADD CONSTRAINT fk_current_session
  FOREIGN KEY (current_session_id)
  REFERENCES sessions(id)
  ON DELETE SET NULL;

-- Pricing Rules
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  station_type_id UUID REFERENCES station_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL
    CHECK (rule_type IN ('happy_hour','membership_discount','package','minute_rate')),
  discount_percent INT,
  fixed_price INT,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Ledger
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount INT NOT NULL,
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('cash','upi','card','membership_credit')),
  upi_reference TEXT,
  collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. INDEXES ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stations_type ON stations(station_type_id);
CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_sessions_station ON sessions(station_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ─── 3. AUTO-CREATE PROFILE ON SIGNUP ────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 4. STATION updated_at TRIGGER ──────────────────────

CREATE OR REPLACE FUNCTION public.update_station_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS station_updated_at ON stations;
CREATE TRIGGER station_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION public.update_station_timestamp();

-- ─── 5. AUDIT LOG TRIGGERS ──────────────────────────────

-- Auto-log station status changes
CREATE OR REPLACE FUNCTION public.audit_station_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      auth.uid(),
      'station.status_changed',
      'station',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_station_status_change ON stations;
CREATE TRIGGER audit_station_status_change
  AFTER UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION public.audit_station_status();

-- Auto-log payment creation
CREATE OR REPLACE FUNCTION public.audit_payment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    NEW.collected_by,
    'payment.created',
    'payment',
    NEW.id,
    jsonb_build_object('amount', NEW.amount, 'method', NEW.payment_method)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_payment_create ON payments;
CREATE TRIGGER audit_payment_create
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_created();

-- ─── 6. ROW LEVEL SECURITY ──────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: check user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'customer');
END;
$$;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL USING (public.get_user_role() = 'admin');

-- STATION TYPES (public read)
CREATE POLICY "Anyone can read station types" ON station_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read station types" ON station_types FOR SELECT TO anon USING (true);
CREATE POLICY "Admin manage station types" ON station_types FOR ALL USING (public.get_user_role() = 'admin');

-- STATIONS
CREATE POLICY "Anyone can read stations" ON stations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can read stations" ON stations FOR SELECT TO anon USING (true);
CREATE POLICY "Staff can update stations" ON stations FOR UPDATE USING (public.get_user_role() IN ('staff', 'admin'));
CREATE POLICY "Admin manage stations" ON stations FOR ALL USING (public.get_user_role() = 'admin');

-- BOOKINGS
CREATE POLICY "Users read own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own bookings" ON bookings FOR UPDATE USING (auth.uid() = user_id AND status = 'confirmed');
CREATE POLICY "Staff read all bookings" ON bookings FOR SELECT USING (public.get_user_role() IN ('staff', 'admin'));
CREATE POLICY "Staff update bookings" ON bookings FOR UPDATE USING (public.get_user_role() IN ('staff', 'admin'));
CREATE POLICY "Admin manage bookings" ON bookings FOR ALL USING (public.get_user_role() = 'admin');

-- SESSIONS
CREATE POLICY "Users read own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff full access sessions" ON sessions FOR ALL USING (public.get_user_role() IN ('staff', 'admin'));

-- PRICING RULES
CREATE POLICY "Anyone can read active pricing" ON pricing_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage pricing" ON pricing_rules FOR ALL USING (public.get_user_role() = 'admin');

-- PAYMENTS
CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff create payments" ON payments FOR INSERT WITH CHECK (public.get_user_role() IN ('staff', 'admin'));
CREATE POLICY "Staff read all payments" ON payments FOR SELECT USING (public.get_user_role() IN ('staff', 'admin'));
CREATE POLICY "Admin manage payments" ON payments FOR ALL USING (public.get_user_role() = 'admin');

-- AUDIT LOGS
CREATE POLICY "Admin read audit logs" ON audit_logs FOR SELECT USING (public.get_user_role() = 'admin');

