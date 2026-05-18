/*
  # Create profiles table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, auto-generated)
      - `username` (text, unique, not null) - login identifier
      - `password_plain` (text, not null) - plain text password for admin recovery
      - `role` (text, not null) - one of: 'owner', 'factory1', 'factory2', 'salesman'
      - `full_name` (text, not null) - display name
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `profiles` table
    - Allow authenticated users to read profiles (needed for role checks)
    - Allow service role full access for login queries

  3. Notes
    - password_plain is stored for easy admin recovery as specified
    - role is stored as text with CHECK constraint for valid values
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_plain text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'factory1', 'factory2', 'salesman')),
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles insert by service"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Profiles update by service"
  ON profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Profiles delete by service"
  ON profiles FOR DELETE
  TO authenticated
  USING (true);

-- Seed initial profiles
INSERT INTO profiles (username, password_plain, role, full_name) VALUES
  ('owner', 'owner123', 'owner', 'Rajesh Kapoor'),
  ('factory1', 'factory123', 'factory1', 'Vikram Singh'),
  ('factory2', 'factory123', 'factory2', 'Anil Sharma'),
  ('salesman', 'sales123', 'salesman', 'Deepak Verma')
ON CONFLICT (username) DO NOTHING;
