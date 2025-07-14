/*
  # Create dishes table and update menus schema

  1. New Tables
    - `dishes`
      - `id` (uuid, primary key)
      - `dishName` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dishes` table
    - Add policies for authenticated users to read dishes
    - Add policies for admin users to manage dishes
*/

CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dishName text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read dishes
CREATE POLICY "Users can read dishes"
  ON dishes
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admin users to manage dishes
CREATE POLICY "Admin users can manage dishes"
  ON dishes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dishes_updated_at
  BEFORE UPDATE ON dishes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();