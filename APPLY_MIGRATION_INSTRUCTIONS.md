# Quick Start: Enable Single vs. Group Gifting

## Step 1: Apply Database Migration

### Using Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**
   - Copy the SQL below:

```sql
-- Add allow_group_gifting column to wishlist_items
-- This allows item creators to choose if multiple people can contribute

ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS allow_group_gifting BOOLEAN DEFAULT false NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.wishlist_items.allow_group_gifting IS 
  'If true, multiple people can contribute to this item (group gifting). If false, only one person can claim it.';

-- Update existing items to disallow group gifting by default (optional - can change to false)
UPDATE public.wishlist_items
SET allow_group_gifting = false
WHERE allow_group_gifting IS NULL;
```

4. **Paste and Execute**
   - Paste the SQL into the editor
   - Click "Run" (or press Ctrl+Enter / Cmd+Enter)
   - You should see: "Success. No rows returned"

## Step 2: (Optional) Remove Unique Constraint

If you want to **fully enable group gifting** and allow multiple claims per item, you may need to remove an existing unique constraint:

```sql
ALTER TABLE public.claims
DROP CONSTRAINT IF EXISTS claims_item_id_key;
```

**Note**: If this constraint doesn't exist, you'll see a message like "constraint does not exist" - that's fine!

## Step 3: Verify Installation

Run this query to confirm the column was added:

```sql
SELECT id, name, allow_group_gifting 
FROM wishlist_items 
LIMIT 5;
```

You should see:
- All items with `allow_group_gifting = false` (default)

## Step 4: Test It Out!

### Create a New Item
1. Go to any of your wishlists
2. Click "Add Item"
3. Fill out the form
4. **New Feature**: You'll see a section "Who can claim this item?"
5. Choose "Single Person" or "Group Gifting"
6. Save the item

### Test Single-Claim (Default)
1. Create an item (leave as "Single Person")
2. Share the wishlist
3. Have someone claim the item
4. Try to have another person claim it
5. ✅ They should see: "This item has already been claimed by someone else!"

### Test Group Gifting
1. Create an item
2. Select "Group Gifting"
3. Share the wishlist
4. Have multiple people claim/contribute to it
5. ✅ All claims should succeed!

## Troubleshooting

### "Column already exists" error
- This is fine! It means the migration was already applied
- Skip to Step 3 to verify

### "Permission denied" error
- Make sure you're logged in as the project owner
- Or run the SQL as a superuser in the Supabase dashboard

### Can't see the new UI element
- Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- The form should show the radio group selector

### Multiple claims not working for group gifts
- Run the Step 2 query to remove the unique constraint
- Check that `allow_group_gifting = true` for the item

## What This Feature Does

### Before
- All items could only be claimed by one person
- No way to enable group contributions

### After
- **Single Person Mode** (Default): Traditional one-person-per-gift
- **Group Gifting Mode**: Multiple people can contribute to expensive items

### UI Preview
When adding/editing items, you'll see:

```
┌─────────────────────────────────────────┐
│ Who can claim this item?                │
│                                         │
│ ⦿ Single Person                         │
│   Only one person can claim and pay     │
│   for this entire item                  │
│                                         │
│ ○ Group Gifting                         │
│   Multiple people can contribute        │
│   towards this item                     │
└─────────────────────────────────────────┘
```

## Need More Info?

See `FEATURE_SINGLE_VS_GROUP_GIFTING.md` for:
- Complete technical documentation
- Business value explanation
- Future enhancement ideas
- Detailed testing scenarios

---

**Total Time**: ~2 minutes to apply migration
**Risk Level**: Low (only adds a new column, doesn't modify existing data)
**Rollback**: If needed, just set `allow_group_gifting = false` on all items

