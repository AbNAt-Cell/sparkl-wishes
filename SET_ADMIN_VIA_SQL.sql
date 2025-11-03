-- Quick SQL Script to Set Admin User
-- Run this in Supabase SQL Editor

-- Step 1: First, find your user (optional - to see all users)
SELECT id, email, raw_app_meta_data->>'role' as current_role
FROM auth.users 
ORDER BY created_at DESC;

-- Step 2: Set admin role by EMAIL (replace 'your-email@example.com')
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-email@example.com';

-- OR Step 2 Alternative: Set admin role by USER ID (replace the UUID)
-- UPDATE auth.users
-- SET raw_app_meta_data = jsonb_set(
--   COALESCE(raw_app_meta_data, '{}'::jsonb),
--   '{role}',
--   '"admin"'
-- )
-- WHERE id = 'paste-your-user-uuid-here';

-- Step 3: Verify it worked
SELECT id, email, raw_app_meta_data->>'role' as role, raw_app_meta_data
FROM auth.users
WHERE email = 'your-email@example.com';

-- The result should show: role = "admin"

