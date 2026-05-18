/*
  # Create factory_logs table

  1. New Tables
    - `factory_logs`
      - `id` (bigint, primary key, auto-increment)
      - `factory_id` (text, not null) - 'factory1' or 'factory2'
      - `log_type` (text, not null) - 'In' or 'Out'
      - `medicine_name` (text, not null) - name of medicine
      - `quantity` (integer, not null) - units moved
      - `operator_name` (text, not null) - who performed the action
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `factory_logs` table
    - All authenticated users can read factory logs
    - Authenticated users can insert/update/delete (owner controls via app)

  3. Notes
    - log_type constrained to 'In' or 'Out'
    - factory_id constrained to 'factory1' or 'factory2'
*/

CREATE TABLE IF NOT EXISTS factory_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  factory_id text NOT NULL CHECK (factory_id IN ('factory1', 'factory2')),
  log_type text NOT NULL CHECK (log_type IN ('In', 'Out')),
  medicine_name text NOT NULL,
  quantity integer NOT NULL,
  operator_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE factory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Factory logs readable by all authenticated"
  ON factory_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Factory logs insert by authenticated"
  ON factory_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Factory logs update by authenticated"
  ON factory_logs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Factory logs delete by authenticated"
  ON factory_logs FOR DELETE
  TO authenticated
  USING (true);
