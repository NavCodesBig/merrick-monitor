-- ============================================================
-- Merrick Monitor — Supabase Database Schema
-- Safe to re-run at any time (fully idempotent)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('nurse', 'counselor', 'admin', 'director');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add 'director' to existing enums that were created before this value existed
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'director';

DO $$ BEGIN CREATE TYPE diabetes_type_enum AS ENUM ('Type 1', 'Type 2');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE event_type_enum AS ENUM ('none', 'high_bg', 'low_bg', 'meal', 'snack', 'routine_check');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS cabins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Unknown',
  role user_role NOT NULL DEFAULT 'counselor',
  cabin_id UUID REFERENCES cabins(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  cabin_id UUID NOT NULL REFERENCES cabins(id),
  diabetes_type diabetes_type_enum NOT NULL,
  insulin_type TEXT,
  target_bg_min INTEGER NOT NULL DEFAULT 70,
  target_bg_max INTEGER NOT NULL DEFAULT 180,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  camp_week INTEGER CHECK (camp_week BETWEEN 1 AND 3),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camper_id UUID NOT NULL REFERENCES campers(id) ON DELETE CASCADE,
  cabin_id UUID NOT NULL REFERENCES cabins(id),
  camp_week INTEGER NOT NULL CHECK (camp_week BETWEEN 1 AND 3),
  camp_day INTEGER NOT NULL CHECK (camp_day BETWEEN 1 AND 7),
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  event_type event_type_enum NOT NULL DEFAULT 'none',
  blood_glucose INTEGER,
  insulin_administered NUMERIC(5,2),
  carbohydrates INTEGER,
  followup_bg INTEGER,
  notes TEXT,
  logged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (camper_id, camp_week, camp_day, hour)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_entries_updated_at ON log_entries;
CREATE TRIGGER log_entries_updated_at
  BEFORE UPDATE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role, cabin_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'),
    (CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('nurse', 'counselor', 'admin', 'director')
      THEN NEW.raw_user_meta_data->>'role'
      ELSE 'counselor'
    END)::user_role,
    NULLIF(NEW.raw_user_meta_data->>'cabin_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    cabin_id = EXCLUDED.cabin_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_cabin_id()
RETURNS UUID AS $$
  SELECT cabin_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE cabins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE campers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

-- ── CABINS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read cabins" ON cabins;
CREATE POLICY "Authenticated users can read cabins"
  ON cabins FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage cabins" ON cabins;
CREATE POLICY "Admins manage cabins"
  ON cabins FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── USERS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users read own profile" ON users;
CREATE POLICY "Users read own profile"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Nurses and admins read all profiles" ON users;
CREATE POLICY "Nurses and admins read all profiles"
  ON users FOR SELECT TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Admins manage all users" ON users;
CREATE POLICY "Admins manage all users"
  ON users FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- ── CAMPERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Nurses and admins read all campers" ON campers;
CREATE POLICY "Nurses and admins read all campers"
  ON campers FOR SELECT TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Counselors read own cabin campers" ON campers;
CREATE POLICY "Counselors read own cabin campers"
  ON campers FOR SELECT TO authenticated
  USING (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id());

DROP POLICY IF EXISTS "Nurses and admins insert campers" ON campers;
CREATE POLICY "Nurses and admins insert campers"
  ON campers FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Nurses and admins update campers" ON campers;
CREATE POLICY "Nurses and admins update campers"
  ON campers FOR UPDATE TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'))
  WITH CHECK (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Counselors update own cabin campers" ON campers;
CREATE POLICY "Counselors update own cabin campers"
  ON campers FOR UPDATE TO authenticated
  USING (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id() AND is_archived = false)
  WITH CHECK (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id() AND is_archived = false);

DROP POLICY IF EXISTS "Nurses and admins delete campers" ON campers;
CREATE POLICY "Nurses and admins delete campers"
  ON campers FOR DELETE TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'));

-- ── LOG ENTRIES ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Nurses and admins read all log entries" ON log_entries;
CREATE POLICY "Nurses and admins read all log entries"
  ON log_entries FOR SELECT TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Counselors read own cabin log entries" ON log_entries;
CREATE POLICY "Counselors read own cabin log entries"
  ON log_entries FOR SELECT TO authenticated
  USING (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id());

DROP POLICY IF EXISTS "Nurses and admins insert log entries" ON log_entries;
CREATE POLICY "Nurses and admins insert log entries"
  ON log_entries FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Counselors insert own cabin log entries" ON log_entries;
CREATE POLICY "Counselors insert own cabin log entries"
  ON log_entries FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id());

DROP POLICY IF EXISTS "Nurses and admins update log entries" ON log_entries;
CREATE POLICY "Nurses and admins update log entries"
  ON log_entries FOR UPDATE TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'))
  WITH CHECK (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Counselors update own cabin log entries" ON log_entries;
CREATE POLICY "Counselors update own cabin log entries"
  ON log_entries FOR UPDATE TO authenticated
  USING (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id())
  WITH CHECK (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id());

DROP POLICY IF EXISTS "Nurses and admins delete log entries" ON log_entries;
CREATE POLICY "Nurses and admins delete log entries"
  ON log_entries FOR DELETE TO authenticated
  USING (get_my_role() IN ('nurse', 'admin', 'director'));

DROP POLICY IF EXISTS "Counselors delete own cabin log entries" ON log_entries;
CREATE POLICY "Counselors delete own cabin log entries"
  ON log_entries FOR DELETE TO authenticated
  USING (get_my_role() = 'counselor' AND cabin_id = get_my_cabin_id());

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'log_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE log_entries;
  END IF;
END $$;
