/*
  # Add active field to users table

  1. Changes
    - Add `active` column to users table with default value true
    - Update existing records to have active = true
    - Add check constraint to ensure active is not null

  2. Security
    - No changes to RLS policies needed
*/

-- Add active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'active'
  ) THEN
    ALTER TABLE users ADD COLUMN active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update all existing users to have active = true
UPDATE users SET active = true WHERE active IS NULL;

-- Add check constraint to ensure active is not null
ALTER TABLE users ADD CONSTRAINT users_active_not_null CHECK (active IS NOT NULL);