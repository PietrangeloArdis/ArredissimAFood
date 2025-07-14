/*
  # Add security policies for menu feedbacks

  1. Changes
    - Enable RLS on menuFeedbacks table
    - Add policies for:
      - Public can read all feedback
      - Users can create/update their own feedback
      - Users can only rate dishes for dates they have selected

  2. Security
    - Enable RLS
    - Add read policy for all users
    - Add write policy for authenticated users (own feedback only)
*/

-- Enable RLS
ALTER TABLE menu_feedbacks ENABLE ROW LEVEL SECURITY;

-- Allow public to read all feedback
CREATE POLICY "Allow public to read feedback"
  ON menu_feedbacks
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to create their own feedback
CREATE POLICY "Users can create own feedback"
  ON menu_feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM menu_selections
      WHERE user_id = auth.uid()
      AND date = menu_feedbacks.date
      AND selected_items @> ARRAY[menu_feedbacks.dish_id]::text[]
    )
  );

-- Allow users to update their own feedback
CREATE POLICY "Users can update own feedback"
  ON menu_feedbacks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);