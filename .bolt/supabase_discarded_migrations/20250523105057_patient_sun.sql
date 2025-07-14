/*
  # Add category and visibility fields to dishes table

  1. Changes
    - Add category field with enum type
    - Add visible field with default true
    - Add check constraint for category values

  2. Security
    - No changes to RLS policies needed
*/

-- Add category enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dish_category') THEN
    CREATE TYPE dish_category AS ENUM ('Primo', 'Secondo', 'Contorno', 'Vegetariano', 'Altro');
  END IF;
END $$;

-- Add category and visible columns
ALTER TABLE dishes 
  ADD COLUMN IF NOT EXISTS category dish_category NOT NULL DEFAULT 'Altro',
  ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

-- Add check constraint for visible
ALTER TABLE dishes 
  ADD CONSTRAINT dishes_visible_not_null CHECK (visible IS NOT NULL);