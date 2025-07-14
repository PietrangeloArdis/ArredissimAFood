/*
  # Add dish statistics and seasonal features

  1. New Columns
    - Add `archived` boolean to dishes table
    - Add `hidden_at` timestamp to dishes table
    - Add `stagione` enum for seasonal categorization
    - Add indexes for performance

  2. Security
    - No changes to RLS policies needed
*/

-- Create season enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dish_season') THEN
    CREATE TYPE dish_season AS ENUM ('Primavera', 'Estate', 'Autunno', 'Inverno', 'Tutto l''anno');
  END IF;
END $$;

-- Add new columns to dishes table
ALTER TABLE dishes 
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS stagione dish_season;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
CREATE INDEX IF NOT EXISTS idx_dishes_visible ON dishes(visible);
CREATE INDEX IF NOT EXISTS idx_dishes_archived ON dishes(archived);
CREATE INDEX IF NOT EXISTS idx_dishes_stagione ON dishes(stagione);

-- Add check constraint for archived
ALTER TABLE dishes 
  ADD CONSTRAINT dishes_archived_not_null CHECK (archived IS NOT NULL);

-- Create view for dish statistics
CREATE OR REPLACE VIEW dish_statistics AS
WITH dish_counts AS (
  SELECT 
    unnest(selected_items) as dish_name,
    COUNT(*) as selection_count
  FROM menu_selections
  GROUP BY dish_name
)
SELECT
  d.id as dish_id,
  d.dish_name,
  d.category,
  COALESCE(dc.selection_count, 0) as total_selections
FROM dishes d
LEFT JOIN dish_counts dc ON dc.dish_name = d.dish_name
ORDER BY dc.selection_count DESC NULLS LAST;