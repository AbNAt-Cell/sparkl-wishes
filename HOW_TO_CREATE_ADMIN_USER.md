# How to Create an Admin User in Supabase

## Method 1: Supabase Dashboard (Recommended)

### Step-by-Step Instructions:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to Authentication**
   - In the left sidebar, click **"Authentication"**
   - Then click **"Users"** (it should be a submenu or tab)

3. **Find Your User**
   - You'll see a list of all users
   - Find the user you want to make admin (you can search by email)
   - **Click on the user's row** to open their details

4. **Edit App Metadata**
   - Look for a section called **"App Metadata"** or **"Raw App Meta Data"**
   - If you see a JSON editor:
     - Click **"Edit"** or the pencil icon
     - Add this JSON:
       ```json
       {
         "role": "admin"
       }
     ```
   - If the field is empty, just paste: `{"role": "admin"}`
   - Click **"Save"** or **"Update"**

### ⚠️ If you can't find the Edit button:

**Alternative UI Path:**
- Some Supabase versions have the metadata in a different place
- Look for **"Raw App Meta Data"** or **"raw_app_meta_data"** field
- You might need to click on the user row to expand details
- The field might be read-only - if so, use **Method 2 (SQL)** below

### Step 3: Test Admin Access
1. **Sign out** from your app
2. **Sign back in** with the admin user
3. You should see:
   - "Admin" button in the navbar
   - Redirect to `/admin` dashboard after login

---

## Method 2: Using SQL Editor (EASIEST if UI doesn't work!)

**This is the most reliable method if you can't edit via the UI:**

1. **Open SQL Editor**
   - Go to **Supabase Dashboard**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Get your user's email or ID first** (if you don't know it):
   ```sql
   -- List all users with their emails
   SELECT id, email, raw_app_meta_data 
   FROM auth.users 
   ORDER BY created_at DESC;
   ```

3. **Set admin role by email** (replace with your actual email):
   ```sql
   -- Update app_metadata for a specific user by email
   UPDATE auth.users
   SET raw_app_meta_data = jsonb_set(
     COALESCE(raw_app_meta_data, '{}'::jsonb),
     '{role}',
     '"admin"'
   )
   WHERE email = 'your-email@example.com';
   ```

   **OR by user ID** (if you have the UUID):
   ```sql
   -- Update app_metadata for a specific user by ID
   UPDATE auth.users
   SET raw_app_meta_data = jsonb_set(
     COALESCE(raw_app_meta_data, '{}'::jsonb),
     '{role}',
     '"admin"'
   )
   WHERE id = 'paste-user-uuid-here';
   ```

4. **Verify it worked:**
   ```sql
   -- Check if the update worked
   SELECT id, email, raw_app_meta_data->>'role' as role
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```
   Should show `role: admin`

5. **Sign out and sign back in** to refresh your session

---

## Method 3: Using Supabase Admin API (For automation)

If you need to set it programmatically via API:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // ⚠️ Never expose this in client-side code!
);

// Update user's app_metadata
const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
  'USER_ID_HERE',
  {
    app_metadata: { role: 'admin' }
  }
);
```

---

## Verify Admin Status

To verify a user is an admin, check:

1. **In Supabase Dashboard:**
   - Go to **Authentication** → **Users**
   - Click on the user
   - Check **App Metadata** should show: `{"role": "admin"}`

2. **In your app:**
   - After signing in, check if:
     - "Admin" button appears in navbar
     - User is redirected to `/admin` dashboard
     - Can access `/admin`, `/admin/users`, `/admin/settings`

---

## Important Notes

⚠️ **The admin role is checked via `user.app_metadata.role === "admin"`**

- This is set in the `auth.users` table in Supabase
- The `is_admin` flag in the `profiles` table is separate and used for other features
- For dashboard access, you **must** set `app_metadata.role = "admin"`

---

## Troubleshooting

### Admin button not showing?
1. Check `app_metadata.role` is set to `"admin"` (not just `is_admin: true` in profiles)
2. Sign out and sign back in to refresh the session
3. Clear browser cache/cookies
4. Check browser console for errors

### Cannot access `/admin` route?
1. Verify `app_metadata.role === "admin"` in Supabase
2. Check that AdminGuard component is working
3. Ensure you're signed in with the correct user

### After making yourself admin, still redirected to `/dashboard`?
- The session needs to be refreshed
- Sign out completely and sign back in
- Or wait a few minutes for the session to refresh automatically

