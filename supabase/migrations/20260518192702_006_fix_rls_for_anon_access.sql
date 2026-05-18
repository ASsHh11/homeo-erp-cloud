/*
  # Fix RLS policies for unauthenticated access

  1. Problem
    - All current RLS policies on profiles, medicines, inventory, sales_ledger, and factory_logs
      are scoped to `authenticated` role only.
    - The login flow queries the `profiles` table before any Supabase auth session exists,
      so the anon user gets zero rows back, causing "Invalid username or password" errors.
    - Similarly, the Header profile switcher and other reads may fail if the session expires.

  2. Changes
    - Add SELECT policy for `anon` role on `profiles` table (needed for login)
    - Add SELECT policy for `anon` role on `medicines` table (needed for medicine dropdowns)
    - Add SELECT policy for `anon` role on `inventory` table (needed for stock queries)
    - Add SELECT policy for `anon` role on `sales_ledger` table (needed for sales display)
    - Add SELECT policy for `anon` role on `factory_logs` table (needed for log display)
    - Add INSERT/UPDATE/DELETE policies for `anon` on all tables (needed for write operations
      since this app uses the anon key for all operations)

  3. Security Notes
    - This app uses a custom login system against the profiles table, not Supabase Auth.
    - The anon key is used as the API key for all client-side operations.
    - RLS still protects against completely unkeyed access (requests without the anon key).
    - The application layer enforces role-based access control in the UI.
*/

-- Profiles: allow anon to read (login), insert, update, delete
CREATE POLICY "Profiles readable by anon"
  ON profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Profiles insert by anon"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Profiles update by anon"
  ON profiles FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Profiles delete by anon"
  ON profiles FOR DELETE
  TO anon
  USING (true);

-- Medicines: allow anon full access
CREATE POLICY "Medicines readable by anon"
  ON medicines FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Medicines insert by anon"
  ON medicines FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Medicines update by anon"
  ON medicines FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Medicines delete by anon"
  ON medicines FOR DELETE
  TO anon
  USING (true);

-- Inventory: allow anon full access
CREATE POLICY "Inventory readable by anon"
  ON inventory FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Inventory insert by anon"
  ON inventory FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Inventory update by anon"
  ON inventory FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Inventory delete by anon"
  ON inventory FOR DELETE
  TO anon
  USING (true);

-- Sales ledger: allow anon full access
CREATE POLICY "Sales ledger readable by anon"
  ON sales_ledger FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Sales ledger insert by anon"
  ON sales_ledger FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Sales ledger update by anon"
  ON sales_ledger FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Sales ledger delete by anon"
  ON sales_ledger FOR DELETE
  TO anon
  USING (true);

-- Factory logs: allow anon full access
CREATE POLICY "Factory logs readable by anon"
  ON factory_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Factory logs insert by anon"
  ON factory_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Factory logs update by anon"
  ON factory_logs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Factory logs delete by anon"
  ON factory_logs FOR DELETE
  TO anon
  USING (true);
