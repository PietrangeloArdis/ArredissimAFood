/*
  # Add dish ratings functionality

  1. New Tables
    - `dish_ratings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `dish_id` (uuid, references dishes)
      - `rating` (integer, 1-5)
      - `comment` (text, optional)
      - `date` (date, when the dish was eaten)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `dish_ratings` table
    - Add policies for:
      - Users can read all ratings
      - Users can only create/update their own ratings
      - Users can only rate dishes once per day
      - Users can only rate dishes they selected for that day

  3. Functions
    - Add function to calculate average rating for a dish
*/

-- Create dish ratings table
CREATE TABLE IF NOT EXISTS dish_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dish_id uuid REFERENCES dishes(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dish_id, date)
);

-- Enable RLS
ALTER TABLE dish_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to ratings"
  ON dish_ratings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own ratings"
  ON dish_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM menu_selections ms
      WHERE ms.user_id = auth.uid()
      AND ms.date = dish_ratings.date::text
      AND ms.selected_items @> ARRAY[(
        SELECT dish_name FROM dishes WHERE id = dish_ratings.dish_id
      )]
    )
  );

CREATE POLICY "Users can update their own ratings"
  ON dish_ratings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_dish_ratings_dish_id ON dish_ratings(dish_id);
CREATE INDEX idx_dish_ratings_user_date ON dish_ratings(user_id, date);

-- Create function to get average rating
CREATE OR REPLACE FUNCTION get_dish_rating(dish_uuid uuid)
RETURNS TABLE (
  average_rating numeric,
  total_ratings bigint
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(*) as total_ratings
  FROM dish_ratings
  WHERE dish_id = dish_uuid;
END;
$$;