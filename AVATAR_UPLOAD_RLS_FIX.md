# Fixing Avatar Upload RLS Policy Error

## Problem
Users are getting the error "Failed to upload avatar: new row violates row-level security policy" when trying to upload a profile picture during signup.

## Root Cause
The Supabase storage bucket policies are preventing authenticated users (or users in the signup process) from uploading files to the `avatars` bucket.

## Solution

### Option 1: Disable RLS on the Avatars Bucket (Recommended for Public Avatars)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Storage** → **avatars** bucket
3. Click the **Policies** button
4. If RLS is enabled, toggle it to **OFF** to disable Row-Level Security
   - This is safe for the avatars bucket since avatars are public anyway
5. Click **Confirm**

### Option 2: Create Proper RLS Policies

If you prefer to keep RLS enabled, create these policies:

1. Go to **Storage** → **avatars** → **Policies**
2. Click **New Policy** and create the following:

**Policy 1: Allow Authenticated Users to Upload**
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');
```

**Policy 2: Allow Public Read Access**
```sql
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### Option 3: Using the Supabase Dashboard UI

If SQL is not available:
1. Go to **Storage** → **avatars**
2. Click **Policies** tab
3. Click **New policy** → **For INSERT**
4. Choose **Authenticated users can upload** or similar template
5. Configure to allow the `authenticated` role
6. Save

## Verification

To verify the fix works:
1. Go to your app's signup form
2. Enter an email, password, and full name
3. Select a profile photo to upload
4. The upload should complete successfully with a progress bar
5. You should see "✓ Photo uploaded" message

## Additional Code Changes Made

1. **Added validation** for file size (max 5MB) and type (image only)
2. **Added try-catch** with better error messages
3. **Made full_name required** with validation
4. **Improved error logging** for debugging
5. **Made avatar optional** - signup can still proceed if avatar upload fails

## If Issues Persist

1. Check browser console (F12) for detailed error messages
2. Check Supabase dashboard logs for the actual RLS policy that's being violated
3. Ensure the `avatars` bucket exists in your Supabase project
4. Try the recommended "Disable RLS on avatars bucket" option if you haven't already

## Related Files Updated
- `src/pages/Auth.tsx` - Improved signup form with better error handling
- `src/components/Navbar.tsx` - Profile picture now displays in header
- Supabase migrations for profile trigger improvements
