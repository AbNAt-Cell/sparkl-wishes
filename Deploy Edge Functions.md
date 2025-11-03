### 🚀 Deploy Edge Functions

1. Go to **Supabase Studio → Functions → Create function**
   - **Name:** `admin-actions`
   - **Runtime:** Deno (HTTP)
   - **Code:** Paste from `supabase/functions/admin-actions/index.ts`
   - Click **Save → Deploy**

2. (Optional) To enable notifications via Brevo:
   - **Name:** `notifications`
   - **Code:** Paste from `supabase/functions/notifications/index.ts`
   - Click **Save → Deploy**

3. Set required secrets:
   - Go to **Project Settings → Configuration → Secrets**
   - Add:
     - `BREVO_API_KEY`
     - `BREVO_FROM_EMAIL`
     - `BREVO_FROM_NAME`

4. Give your account admin access:
   - Go to **Auth → Users**
   - Select your user
   - Under **App Metadata**, set:
     ```json
     { "role": "admin" }
     ```
   - Save, sign out, and sign back in.
   - Visit `/admin` and `/admin/settings`.
