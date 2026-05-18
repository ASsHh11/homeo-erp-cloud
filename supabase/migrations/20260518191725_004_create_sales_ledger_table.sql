/*
  # Create sales_ledger table

  1. New Tables
    - `sales_ledger`
      - `id` (bigint, primary key, auto-increment)
      - `shop_name` (text, not null) - client/shop name
      - `medicine_name` (text, not null) - name of medicine sold
      - `potency_used` (text, nullable) - potency if applicable
      - `quantity` (integer, not null) - units sold
      - `amount_paid` (numeric, not null, default 0) - cash collected in PKR
      - `amount_pending` (numeric, not null, default 0) - credit/arrears in PKR
      - `payment_status` (text, not null) - 'Paid' or 'Unpaid'
      - `factory_source` (text, not null) - 'factory1' or 'factory2'
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `sales_ledger` table
    - All authenticated users can read sales
    - Authenticated users can insert/update/delete (owner controls via app)

  3. Notes
    - payment_status is constrained to 'Paid' or 'Unpaid'
    - factory_source indicates which factory the stock was drawn from
*/

CREATE TABLE IF NOT EXISTS sales_ledger (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  shop_name text NOT NULL,
  medicine_name text NOT NULL,
  potency_used text,
  quantity integer NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  amount_pending numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL CHECK (payment_status IN ('Paid', 'Unpaid')),
  factory_source text NOT NULL CHECK (factory_source IN ('factory1', 'factory2')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales ledger readable by all authenticated"
  ON sales_ledger FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales ledger insert by authenticated"
  ON sales_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sales ledger update by authenticated"
  ON sales_ledger FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Sales ledger delete by authenticated"
  ON sales_ledger FOR DELETE
  TO authenticated
  USING (true);
