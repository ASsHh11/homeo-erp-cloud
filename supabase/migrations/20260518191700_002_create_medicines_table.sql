/*
  # Create medicines table

  1. New Tables
    - `medicines`
      - `id` (bigint, primary key, auto-increment)
      - `name` (text, not null) - medicine/formula name
      - `category` (text, not null, default 'General') - category classification
      - `potency` (text, nullable) - potency like 30C, 200C, 1M, Q, or null
      - `price` (numeric, not null, default 0) - MSRP selling price in PKR
      - `cost` (numeric, not null, default 0) - manufacturing cost in PKR
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `medicines` table
    - All authenticated users can read medicines
    - Only authenticated users can insert/update/delete (owner controls via app)

  3. Notes
    - Initialized with 4 basic formulas as specified
    - potency is nullable since some formulas may not use potency
*/

CREATE TABLE IF NOT EXISTS medicines (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  potency text,
  price numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicines readable by all authenticated"
  ON medicines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Medicines insert by authenticated"
  ON medicines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Medicines update by authenticated"
  ON medicines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Medicines delete by authenticated"
  ON medicines FOR DELETE
  TO authenticated
  USING (true);

-- Seed 4 basic formulas
INSERT INTO medicines (name, category, potency, price, cost) VALUES
  ('Formula 1', 'General', NULL, 450, 200),
  ('Formula 2', 'General', NULL, 550, 250),
  ('Formula 3', 'General', NULL, 350, 150),
  ('Formula 4', 'General', NULL, 650, 300);
