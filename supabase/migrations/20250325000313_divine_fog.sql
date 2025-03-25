/*
  # Set up Admin User

  1. Changes
    - Ensure admin user exists
    - Set admin privileges
    - Configure test profile as admin

  2. Security
    - Maintain RLS policies
    - Ensure proper access control
*/

-- First, ensure the admin user has proper privileges
UPDATE profiles
SET 
  is_admin = true,
  full_name = 'John Kariuki',
  phone = '+254700000000',
  address = 'Nairobi, Kenya',
  date_of_birth = '1990-01-01'::date,
  employment_status = 'employed',
  monthly_income = 100000
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'johnykariuki20@gmail.com'
);

-- If the admin user doesn't exist yet, create it
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