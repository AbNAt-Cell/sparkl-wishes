# 🗄️ DATABASE MIGRATION GUIDE

**Date**: November 2, 2025  
**Purpose**: Apply all new feature migrations to your Supabase database  

---

## 🚀 QUICK START (Recommended Method)

Since you're using Supabase's hosted service, the easiest way is to run migrations directly in the Supabase Dashboard:

### **Step-by-Step Instructions:**

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Sign in to your account
   - Select your `sparkl-wishes` project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Copy the Migration SQL**
   - Open this file: `supabase/migrations/APPLY_ALL_NEW_FEATURES.sql`
   - Select ALL content (Ctrl+A / Cmd+A)
   - Copy it (Ctrl+C / Cmd+C)

4. **Paste and Run**
   - Paste the SQL into the SQL Editor (Ctrl+V / Cmd+V)
   - Click "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for execution to complete (should take 2-5 seconds)

5. **Verify Success**
   - You should see "Success. No rows returned"
   - Check for any errors in red text
   - If errors appear, scroll down to troubleshooting section

---

## 📊 WHAT MIGRATIONS INCLUDE

The `APPLY_ALL_NEW_FEATURES.sql` file includes:

### ✅ **1. Guest Book / Comments**
- `wishlist_comments` table
- RLS policies
- Indexes for performance
- Update trigger

### ✅ **2. Cash Contributions**
- `cash_contributions` table
- RLS policies
- Wallet credit trigger
- Payment status tracking

### ✅ **3. Group Gifting / Partial Claims**
- `is_group_gift` column on `claims`
- `contribution_amount` column on `claims`
- Updated wallet trigger to handle partial amounts

### ✅ **4. Thank You Messages**
- `thank_you_message` column on `claims`
- `thank_you_sent_at` timestamp column

### ✅ **5. Currency Consistency Fix**
- Updated `handle_payment_completion` function
- Fixes currency mismatch issues
- Ensures wallet currency matches wishlist currency

---

## 🔍 HOW TO CHECK IF MIGRATIONS RAN

After running the migration, verify the changes:

### **Method 1: Table Editor**
1. Go to "Table Editor" in Supabase Dashboard
2. Check if these tables exist:
   - ✅ `wishlist_comments`
   - ✅ `cash_contributions`
3. Click on `claims` table
4. Check if these columns exist:
   - ✅ `is_group_gift`
   - ✅ `contribution_amount`
   - ✅ `thank_you_message`
   - ✅ `thank_you_sent_at`

### **Method 2: SQL Query**
Run this in SQL Editor to check:

```sql
-- Check if new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('wishlist_comments', 'cash_contributions');

-- Check if new columns exist on claims
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'claims' 
AND column_name IN ('is_group_gift', 'contribution_amount', 'thank_you_message', 'thank_you_sent_at');
```

You should see all tables and columns listed.

---

## ⚠️ TROUBLESHOOTING

### **Error: "relation already exists"**
**Meaning**: Some tables/columns already exist  
**Solution**: This is OK! The migration uses `IF NOT EXISTS` and `IF EXISTS` clauses, so it's safe to run multiple times.

### **Error: "column already exists"**
**Meaning**: Some columns were already added  
**Solution**: This is OK! You can ignore this or run the migration in parts.

### **Error: "permission denied"**
**Meaning**: Your database user doesn't have permission  
**Solution**: Make sure you're logged in as the project owner in Supabase Dashboard.

### **Error: "syntax error at or near..."**
**Meaning**: SQL syntax issue (unlikely with our migration)  
**Solution**: 
1. Make sure you copied the ENTIRE file
2. Try copying again (ensure no corruption)
3. Check if you accidentally modified the SQL

### **Migration seems stuck**
**Solution**:
1. Wait 30 seconds (large migrations take time)
2. If still stuck, refresh the page and check if it completed
3. Run the verification queries above to check progress

---

## 🔄 ALTERNATIVE: Run Migrations Individually

If the consolidated file has issues, run migrations one at a time:

### **1. Guest Book (Comments)**
File: `supabase/migrations/20251102000000_create_comments.sql`

### **2. Cash Contributions**
File: `supabase/migrations/20251102000001_create_cash_funds.sql`

### **3. Group Gifting**
File: `supabase/migrations/20251102000002_add_partial_claims.sql`

### **4. Thank You Messages**
File: `supabase/migrations/20251102000003_add_thank_you_messages.sql`

**To run individually:**
1. Open each file
2. Copy contents
3. Paste into SQL Editor
4. Run
5. Move to next file

---

## 🛠️ SETTING UP SUPABASE CLI (Optional)

If you want to use the CLI in the future:

### **1. Install Supabase CLI**
```bash
npm install -g supabase
```

### **2. Login to Supabase**
```bash
npx supabase login
```

### **3. Link Your Project**
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

**To find your project ref:**
- Go to Supabase Dashboard
- Click on Project Settings (gear icon)
- Under "General" tab, find "Reference ID"
- Copy that ID

### **4. Push Migrations**
```bash
npx supabase db push
```

**Note**: This is optional and NOT required for the platform to work. The Dashboard method is simpler and works perfectly fine!

---

## ✅ VERIFICATION CHECKLIST

After running migrations, test these features:

### **Guest Book**
- [ ] Navigate to a shared wishlist
- [ ] Try leaving a comment
- [ ] Comment should appear immediately

### **Cash Contributions**
- [ ] Navigate to a shared wishlist
- [ ] Click "Contribute to Cash Fund"
- [ ] Make a test contribution
- [ ] Check wallet balance increases

### **Group Gifting**
- [ ] Navigate to a shared wishlist
- [ ] Claim an item
- [ ] Select "Partial Contribution"
- [ ] Enter amount and pay
- [ ] Verify wallet credited correctly

### **Thank You Messages**
- [ ] Go to your own wishlist
- [ ] Find a claimed item
- [ ] Click "Say Thank You"
- [ ] Send a message
- [ ] Verify "Thank You Sent" appears

---

## 📝 BACKUP RECOMMENDATION

**Before running migrations** (optional but recommended):

1. Go to Database → Backups in Supabase Dashboard
2. Click "Create backup"
3. Wait for backup to complete
4. Then run migrations

This way, if anything goes wrong, you can restore the backup.

---

## 🆘 IF SOMETHING GOES WRONG

### **Option 1: Restore Backup**
1. Go to Database → Backups
2. Select your most recent backup
3. Click "Restore"

### **Option 2: Drop New Tables**
If you just want to undo the new features:

```sql
-- WARNING: This will delete all data in these tables!
DROP TABLE IF EXISTS public.wishlist_comments CASCADE;
DROP TABLE IF EXISTS public.cash_contributions CASCADE;

-- Remove new columns from claims
ALTER TABLE public.claims 
DROP COLUMN IF EXISTS is_group_gift,
DROP COLUMN IF EXISTS contribution_amount,
DROP COLUMN IF EXISTS thank_you_message,
DROP COLUMN IF EXISTS thank_you_sent_at;
```

### **Option 3: Contact Support**
- Email: support@sparklwishes.com
- Supabase Support: https://supabase.com/support

---

## 🎯 QUICK REFERENCE

### **Migration File Location:**
```
supabase/migrations/APPLY_ALL_NEW_FEATURES.sql
```

### **Total Lines:**
- ~354 lines of SQL

### **Execution Time:**
- 2-5 seconds (typically)

### **Tables Created:**
- `wishlist_comments`
- `cash_contributions`

### **Columns Added to `claims`:**
- `is_group_gift` (boolean)
- `contribution_amount` (numeric)
- `thank_you_message` (text)
- `thank_you_sent_at` (timestamptz)

### **Triggers Updated:**
- `handle_payment_completion` (now handles partial amounts)
- `handle_cash_contribution_completion` (new)

### **Functions Created:**
- `handle_cash_contribution_completion()`

### **RLS Policies:**
- 15+ new policies across tables

---

## 📞 NEED HELP?

If you're still having issues:

1. **Check browser console** for errors (F12)
2. **Check Supabase logs** in Dashboard → Logs
3. **Screenshot the error** for troubleshooting
4. **Try the verification queries** above to see what's missing

---

## ✅ SUCCESS INDICATORS

You'll know migrations succeeded when:

1. ✅ No red error messages in SQL Editor
2. ✅ Message says "Success. No rows returned"
3. ✅ New tables visible in Table Editor
4. ✅ New columns visible in `claims` table
5. ✅ All features work in the frontend

---

## 🎉 YOU'RE DONE!

Once migrations are applied successfully:

1. Refresh your application
2. Test the new features
3. Celebrate! 🎊

All new features should now be working:
- ✅ Guest Book comments
- ✅ Cash contributions
- ✅ Group gifting
- ✅ Thank you messages
- ✅ Currency consistency

**Your platform is now fully functional with all features!** 🚀


