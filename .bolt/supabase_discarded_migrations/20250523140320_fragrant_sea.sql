/*
  # Add user deletion support

  1. Changes
    - Add cascade delete triggers for user data
    - Add function to handle user deletion cleanup

  2. Security
    - Only allow admin users to delete users
*/

-- Create function to handle user deletion cleanup
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all menu selections for the user
  DELETE FROM menu_selections WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up user data on deletion
CREATE TRIGGER user_deletion_cleanup
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- Add policy to allow admin users to delete users
CREATE POLICY "Allow admin users to delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );