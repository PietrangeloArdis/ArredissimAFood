/*
  # Refactor Dish Structure - Add Vegetarian Flag

  1. Changes
    - Add vegetarian boolean column to dishes table
    - Set default value to false for new dishes
    - Migrate existing vegetarian dishes
    - Remove "Vegetariano" from valid categories

  2. Data Migration
    - Update existing vegetarian dishes to have proper category
    - Set vegetarian flag for previously categorized vegetarian dishes
*/

-- Add vegetarian column with default false
ALTER TABLE dishes 
ADD COLUMN IF NOT EXISTS vegetarian boolean DEFAULT false;

-- Update existing vegetarian dishes
DO $$ 
BEGIN
  -- First, set vegetarian flag for all dishes currently marked as vegetarian
  UPDATE dishes 
  SET 
    vegetarian = true,
    category = 'Altro'
  WHERE category = 'Vegetariano';

  -- Add check constraint for valid categories
  ALTER TABLE dishes
  DROP CONSTRAINT IF EXISTS dishes_category_check;

  ALTER TABLE dishes
  ADD CONSTRAINT dishes_category_check 
  CHECK (category IN ('Primo', 'Secondo', 'Contorno', 'Altro'));
END $$;