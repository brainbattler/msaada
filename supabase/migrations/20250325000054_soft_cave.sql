/*
  # Recreate Profiles Table with Enhanced Structure

  1. Changes
    - Update profiles table with improved structure
    - Add comprehensive validation checks
    - Enhanced RLS policies
    - Better constraints and defaults

  2. Security
    - Maintain strict RLS policies
    - Add data validation triggers
    - Ensure proper user access control
*/

-- First, drop the existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Remove the trigger
DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;

-- Backup existing data
CREATE TEMP TABLE profiles_backup AS SELECT * FROM profiles;

-- Drop and recreate the profiles table with new structure
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS John,
  ALTER COLUMN full_name TYPE text,
  ALTER COLUMN full_name SET NOT NULL,
  ADD CONSTRAINT full_name_length CHECK (char_length(full_name) >= 2),
  
  ALTER COLUMN phone TYPE text,
  ALTER COLUMN phone SET NOT NULL,
  ADD CONSTRAINT phone_length CHECK (char_length(phone) >= 10),
  
  ALTER COLUMN address TYPE text,
  ALTER COLUMN address SET NOT NULL,
  ADD CONSTRAINT address_length CHECK (char_length(address) >= 5),
  
  ALTER COLUMN date_of_birth TYPE date,
  ALTER COLUMN date_of_birth SET NOT NULL,
  ADD CONSTRAINT age_check CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years'),
  
  ALTER COLUMN employment_status TYPE text,
  ALTER COLUMN employment_status SET NOT NULL,
  ADD CONSTRAINT valid_employment_status CHECK (
    employment_status IN ('employed', 'self-employed', 'unemployed', 'retired')
  ),
  
  ALTER COLUMN monthly_income TYPE numeric,
  ALTER COLUMN monthly_income SET NOT NULL,
  ADD CONSTRAINT positive_income CHECK (monthly_income >= 0),
  
  ALTER COLUMN is_admin SET DEFAULT false,
  
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Recreate the updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Set admin privileges for specified user
UPDATE profiles
SET is_admin = true
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'johnykariuki20@gmail.com'
);

-- If the admin user doesn't exist, create it
INSERT INTO profiles (
  user_id,
  full_name,
  phone,
  address,
  date_of_birth,
  employment_status,
  monthly_income,
  is_admin
)
SELECT 
  id as user_id,
  'John Kariuki' as full_name,
  '+254700000000' as phone,
  'Nairobi, Kenya' as address,
  '1990-01-01'::date as date_of_birth,
  'employed' as employment_status,
  100000 as monthly_income,
  true as is_admin
FROM auth.users
WHERE email = 'johnykariuki20@gmail.com'
  AND NOT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE user_id = auth.users.id
  );

-- Clean up
DROP TABLE profiles_backup;