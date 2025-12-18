-- Relax the profile insert policy to allow service role and trigger to work
CREATE POLICY "Allow inserts during signup"
  ON public.profiles FOR INSERT
  WITH CHECK (
    -- Allow the trigger to insert during auth user creation
    auth.uid() = id 
    OR auth.role() = 'authenticated'
  );

-- Drop the old restrictive policy if it exists and replace it
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Keep the relaxed policy
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    OR auth.role() = 'authenticated'
  );
