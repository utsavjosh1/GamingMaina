CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"station_type_id" uuid NOT NULL,
	"station_id" uuid,
	"booking_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"duration_hours" numeric(4, 2) NOT NULL,
	"estimated_price" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"session_id" uuid,
	"user_id" text,
	"amount" integer NOT NULL,
	"payment_method" text,
	"payment_status" text DEFAULT 'paid' NOT NULL,
	"upi_reference" text,
	"collected_by" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_type_id" uuid,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"discount_percent" integer,
	"fixed_price" integer,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"phone" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"membership_type" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"user_id" text,
	"station_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paused_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"total_paused_minutes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"base_price_per_hour" integer NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "station_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"current_session_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_station_type_id_station_types_id_fk" FOREIGN KEY ("station_type_id") REFERENCES "public"."station_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_profiles_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_station_type_id_station_types_id_fk" FOREIGN KEY ("station_type_id") REFERENCES "public"."station_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_started_by_profiles_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_station_type_id_station_types_id_fk" FOREIGN KEY ("station_type_id") REFERENCES "public"."station_types"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
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

--> statement-breakpoint
-- Public, cacheable site media served through Supabase Storage/CDN.
-- Uploads are intentionally not public: deployment tooling uses the secret key.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Supabase owns storage.objects and already enables RLS on it; the app DB role
-- may create policies, but cannot ALTER the Storage-managed table itself.
DROP POLICY IF EXISTS "Public media is readable" ON storage.objects;
CREATE POLICY "Public media is readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');

-- No INSERT/UPDATE/DELETE policy is granted to anon or authenticated. Asset
-- deployment runs outside the browser with SUPABASE_SECRET_KEY, which
-- bypasses Storage RLS without exposing an upload endpoint to visitors.

-- image_url stores a Storage path for portability between Supabase projects;
-- the application resolves it to the current project's public CDN URL.
UPDATE public.station_types
SET image_url = CASE name
  WHEN 'PC-RTX' THEN 'site/spiderman.jpeg'
  WHEN 'PC-GTX' THEN 'site/gta5.jpg'
  WHEN 'PS5' THEN 'site/gow.webp'
  WHEN 'PS4' THEN 'site/rdr2.jpg'
  WHEN 'Virtual Reality' THEN 'site/spiderman.jpeg'
  WHEN 'Racing Wheel' THEN 'site/bmw.jpg'
  WHEN 'Billiards' THEN 'site/gta5.jpg'
  WHEN 'Air Hockey' THEN 'site/gow.webp'
  WHEN 'Shooting' THEN 'site/rdr2.jpg'
  ELSE image_url
END
WHERE name IN (
  'PC-RTX', 'PC-GTX', 'PS5', 'PS4', 'Virtual Reality',
  'Racing Wheel', 'Billiards', 'Air Hockey', 'Shooting'
);
