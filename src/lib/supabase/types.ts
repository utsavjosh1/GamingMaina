export type StationStatus =
  | "available"
  | "booked"
  | "in_use"
  | "maintenance"
  | "offline";

export type BookingStatus =
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type SessionStatus = "active" | "paused" | "completed" | "force_ended";

export type PaymentMethod = "cash" | "upi" | "card" | "membership_credit";
export type PaymentStatus = "pending" | "paid" | "void";

export type UserRole = "customer" | "staff" | "admin";

export type MembershipType = "none" | "silver" | "gold" | "platinum";

export type PricingRuleType =
  | "happy_hour"
  | "membership_discount"
  | "package"
  | "minute_rate";

// ─── Row Types ───────────────────────────────────────────

export interface StationType {
  [key: string]: unknown;
  id: string;
  name: string;
  category: string;
  base_price_per_hour: number;
  image_url: string | null;
  created_at: string;
}

export interface Station {
  [key: string]: unknown;
  id: string;
  station_type_id: string;
  name: string;
  status: StationStatus;
  current_session_id: string | null;
  updated_at: string;
  created_at: string;
  // Joined
  station_type?: StationType;
}

export interface Profile {
  [key: string]: unknown;
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  membership_type: MembershipType;
  created_at: string;
}

export interface Booking {
  [key: string]: unknown;
  id: string;
  user_id: string;
  station_type_id: string;
  station_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  estimated_price: number;
  status: BookingStatus;
  expires_at: string | null;
  created_at: string;
  // Joined
  station_type?: StationType;
  station?: Station;
  profile?: Profile;
}

export interface Session {
  [key: string]: unknown;
  id: string;
  booking_id: string | null;
  user_id: string | null;
  station_id: string;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_minutes: number;
  status: SessionStatus;
  started_by: string | null;
  created_at: string;
  // Joined
  station?: Station;
  profile?: Profile;
}

export interface PricingRule {
  [key: string]: unknown;
  id: string;
  station_type_id: string | null;
  name: string;
  rule_type: PricingRuleType;
  discount_percent: number | null;
  fixed_price: number | null;
  conditions: Record<string, unknown>;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface Payment {
  [key: string]: unknown;
  id: string;
  booking_id: string | null;
  session_id: string | null;
  user_id: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  upi_reference: string | null;
  collected_by: string | null;
  notes: string | null;
  created_at: string;
  // Joined
  profile?: Profile;
  collector?: Profile;
}

export type AdminStation = Station & { station_type: StationType | null };
export type AdminBooking = Booking & {
  station_type: StationType | null;
  station: Station | null;
  profile: Profile | null;
};
export type AdminSession = Session & {
  station: AdminStation | null;
  profile: Profile | null;
};

export interface AuditLog {
  [key: string]: unknown;
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ─── Supabase Database Type ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      station_types: {
        Row: StationType;
        Insert: Omit<StationType, "id" | "created_at">;
        Update: Partial<Omit<StationType, "id" | "created_at">>;
        Relationships: [];
      };
      stations: {
        Row: Station;
        Insert: Omit<
          Station,
          "id" | "created_at" | "updated_at" | "station_type"
        >;
        Update: Partial<Omit<Station, "id" | "created_at" | "station_type">>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        // Role and membership_type are intentionally omitted: customers must not
        // be able to change authorization or billing privileges directly.
        Update: Partial<Pick<Profile, "full_name" | "avatar_url" | "phone">>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: Omit<
          Booking,
          "id" | "created_at" | "station_type" | "station" | "profile"
        >;
        Update: Partial<
          Omit<
            Booking,
            "id" | "created_at" | "station_type" | "station" | "profile"
          >
        >;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: Partial<
          Pick<
            Session,
            | "started_at"
            | "paused_at"
            | "ended_at"
            | "total_paused_minutes"
            | "status"
          >
        > &
          Omit<
            Session,
            | "id"
            | "created_at"
            | "station"
            | "profile"
            | "started_at"
            | "paused_at"
            | "ended_at"
            | "total_paused_minutes"
            | "status"
          >;
        Update: Partial<
          Omit<Session, "id" | "created_at" | "station" | "profile">
        >;
        Relationships: [];
      };
      pricing_rules: {
        Row: PricingRule;
        Insert: Omit<PricingRule, "id" | "created_at">;
        Update: Partial<Omit<PricingRule, "id" | "created_at">>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at" | "profile" | "collector">;
        Update: Partial<
          Omit<Payment, "id" | "created_at" | "profile" | "collector">
        >;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at">;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_station_type_availability: {
        Args: Record<string, never>;
        Returns: Array<StationType & { available: number; total: number }>;
      };
      get_available_slots: {
        Args: { p_station_type_id: string; p_date: string; p_duration_hours?: number };
        Returns: Array<{ start_time: string; end_time: string; available: number; total: number }>;
      };
      cancel_booking: { Args: { p_booking_id: string }; Returns: boolean };
      update_station_status: { Args: { p_station_id: string; p_status: string }; Returns: boolean };
      create_booking: {
        Args: { p_station_type_id: string; p_booking_date: string; p_start_time: string; p_duration_hours: number };
        Returns: Booking;
      };
      start_session: {
        Args: { p_station_id: string; p_user_id?: string | null };
        Returns: Session;
      };
      pause_session: { Args: { p_session_id: string }; Returns: Session };
      resume_session: { Args: { p_session_id: string }; Returns: Session };
      end_session: {
        Args: { p_session_id: string };
        Returns: { session_id: string; total_minutes: number; total_price: number; station_name: string };
      };
      collect_payment: {
        Args: {
          p_booking_id?: string | null;
          p_session_id?: string | null;
          p_user_id?: string | null;
          p_amount: number;
          p_method: PaymentMethod;
          p_upi_reference?: string | null;
          p_notes?: string | null;
        };
        Returns: Payment;
      };
    };
  };
}
