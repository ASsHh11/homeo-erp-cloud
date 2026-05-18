/*
  # Create inventory table

  1. New Tables
    - `inventory`
      - `id` (bigint, primary key, auto-increment)
      - `medicine_id` (bigint, references medicines.id ON DELETE CASCADE)
      - `factory_id` (text, not null) - 'factory1' or 'factory2'
      - `stock_quantity` (integer, not null, default 0)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `inventory` table
    - All authenticated users can read inventory
    - Authenticated users can insert/update/delete

  3. Notes
    - Each medicine has 2 inventory rows (one per factory)
    - ON DELETE CASCADE ensures inventory is cleaned up when medicine is deleted
    - Unique constraint on (medicine_id, factory_id) prevents duplicates
*/

CREATE TABLE IF NOT EXISTS inventory (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  medicine_id bigint NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  factory_id text NOT NULL CHECK (factory_id IN ('factory1', 'factory2')),
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(medicine_id, factory_id)
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory readable by all authenticated"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Inventory insert by authenticated"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Inventory update by authenticated"
  ON inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Inventory delete by authenticated"
  ON inventory FOR DELETE
  TO authenticated
  USING (true);

-- Seed inventory for the 4 formulas across both factories
INSERT INTO inventory (medicine_id, factory_id, stock_quantity)
SELECT m.id, 'factory1', 100 FROM medicines m
UNION ALL
SELECT m.id, 'factory2', 80 FROM medicines m;
