-- Storage bucket policies for avatars
-- This SQL should be run to set up proper policies on the avatars bucket

-- Note: Storage policies are managed via the Supabase dashboard
-- But here are the recommended policies:

-- Policy 1: Allow authenticated users to upload to temp folder
-- (Anonymous users can upload to temp/*, authenticated users can upload to their own folder)
-- This allows signup users to upload before their profile is created

-- Policy 2: Allow public read access to all avatar files
-- (Anyone can view avatars)

-- If you're getting RLS errors on avatar upload, check that:
-- 1. The avatars bucket exists
-- 2. RLS is disabled on the bucket (recommended for public avatars)
-- 3. Or if RLS is enabled, policies allow authenticated users to INSERT

-- To fix this issue, go to Supabase Dashboard:
-- Storage > avatars > Policies
-- Create or verify these policies exist:
--
-- CREATE POLICY "Allow authenticated users to upload"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'avatars')
--
-- CREATE POLICY "Allow public read"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'avatars')
