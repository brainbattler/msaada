/*
  # Add Admin Role Support

  1. Changes
    - Add admin column to profiles table
    - Add admin-specific policies
    - Add function to check admin status

  2. Security
    - Only admins can view all loan applications
    - Only admins can update loan application status
*/

-- Add admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies for loan applications
CREATE POLICY "Admins can view all loan applications"
  ON loan_applications
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update loan status"
  ON loan_applications
  FOR UPDATE
  TO authenticated
  USING (is_admin());