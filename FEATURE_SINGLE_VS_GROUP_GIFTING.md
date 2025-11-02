# Single vs. Group Gifting Feature

## 🎁 Overview

Users can now choose whether each wishlist item can be claimed by:
- **Single Person**: Only one person can claim and pay for the entire item
- **Group Gifting**: Multiple people can contribute towards the item

## 📋 What Changed

### Database Changes
- **New Column**: `allow_group_gifting` (boolean) added to `wishlist_items` table
- **Migration File**: `supabase/migrations/20251102000004_add_allow_group_gifting.sql`
- **Default Value**: `false` (single-claim mode)

### Frontend Changes

#### 1. **WishlistDetail.tsx** (Item Creation/Editing)
- Added `allow_group_gifting` to item form data
- New UI: Radio group selector with two options:
  - **Single Person**: "Only one person can claim and pay for this entire item"
  - **Group Gifting**: "Multiple people can contribute towards this item"
- Appears in both "Add Item" and "Edit Item" dialogs
- Beautiful card-style selection with hover effects

#### 2. **ClaimItemDialog.tsx** (Claiming Logic)
- New prop: `allowGroupGifting?: boolean`
- Updated claim validation:
  - **If `allowGroupGifting = false`**: Checks for existing claims and blocks if already claimed
  - **If `allowGroupGifting = true`**: Allows multiple people to claim/contribute

#### 3. **SharedWishlist.tsx** (Public View)
- Passes `allow_group_gifting` value from database to `ClaimItemDialog`
- Type casting to handle the new database column
- Seamless integration with existing claim flow

## 🚀 How to Enable This Feature

### Step 1: Run the Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/migrations/20251102000004_add_allow_group_gifting.sql`
4. Copy the SQL and paste it into the SQL Editor
5. Click **Run**

**Option B: Supabase CLI**
```bash
npx supabase db push
```

### Step 2: Verify the Migration
Run this query in Supabase SQL Editor to confirm:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'wishlist_items' 
  AND column_name = 'allow_group_gifting';
```

Expected result:
```
column_name         | data_type | column_default
--------------------|-----------|---------------
allow_group_gifting | boolean   | false
```

### Step 3: Test the Feature

#### Test Scenario 1: Single-Claim Item (Default)
1. Create a new wishlist item
2. Leave "Single Person" selected (default)
3. Save the item
4. Have User A claim it
5. Try to have User B claim the same item
6. ✅ User B should see: "This item has already been claimed by someone else!"

#### Test Scenario 2: Group Gifting Item
1. Create a new wishlist item
2. Select "Group Gifting"
3. Save the item
4. Have User A claim/contribute to it
5. Try to have User B claim/contribute to the same item
6. ✅ User B should be able to claim it successfully
7. ✅ Both claims should appear in the database

#### Test Scenario 3: Editing Existing Items
1. Edit an existing item
2. Change from "Single Person" to "Group Gifting"
3. Save
4. Verify multiple users can now claim it

## 🎨 UI/UX Features

### Radio Group Selection
```
┌─────────────────────────────────────────────┐
│ Who can claim this item?                    │
├─────────────────────────────────────────────┤
│ ○ Single Person                             │
│   Only one person can claim and pay for     │
│   this entire item                          │
├─────────────────────────────────────────────┤
│ ● Group Gifting                             │
│   Multiple people can contribute towards    │
│   this item                                 │
└─────────────────────────────────────────────┘
```

- **Clean Design**: Card-style options with clear descriptions
- **Hover Effect**: Cards highlight on hover for better UX
- **Default**: Single Person (safer default, prevents accidental group gifting)
- **Visibility**: Appears in both Add and Edit dialogs

## 🔧 Technical Details

### Database Schema
```sql
ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS allow_group_gifting BOOLEAN DEFAULT false NOT NULL;
```

### Type Definitions
```typescript
// ClaimItemDialog Props
interface ClaimItemDialogProps {
  allowGroupGifting?: boolean;  // New prop
  // ... other props
}

// SharedWishlist selectedItem state
const [selectedItem, setSelectedItem] = useState<{
  id: string;
  name: string;
  price: number | null;
  allowGroupGifting: boolean;  // New field
} | null>(null);
```

### Claim Logic Flow
```
User clicks "Claim Gift"
       ↓
Open ClaimItemDialog
       ↓
User submits claim form
       ↓
Is allowGroupGifting enabled?
       ├── NO (Single-claim) → Check if item already claimed
       │                       ├── YES → Show error, block claim
       │                       └── NO  → Create claim, proceed
       │
       └── YES (Group gifting) → Skip check, always allow claim
                                  Create claim, proceed
```

## 📊 Database Impact

### Before Migration
- All items effectively had single-claim behavior (enforced by unique constraint)
- Constraint: `claims_item_id_key` (if exists)

### After Migration
- Items have explicit `allow_group_gifting` flag
- Single-claim: Enforced by frontend check
- Group gifting: Multiple claims allowed per item
- **Note**: If `claims_item_id_key` constraint exists, you should remove it to fully enable group gifting:
  ```sql
  ALTER TABLE public.claims
  DROP CONSTRAINT IF EXISTS claims_item_id_key;
  ```

## 🎯 Business Value

### For Users (Wishlist Owners)
- **Flexibility**: Choose claim type per item
- **Expensive Items**: Enable group gifting for high-value items
- **Personal Items**: Keep single-claim for unique/personal gifts
- **Control**: Full control over gifting strategy

### For Gifters
- **Transparency**: Clear indication if group gifting is allowed
- **Collaboration**: Can pool money for expensive gifts
- **Fairness**: No race conditions for popular items when group gifting enabled

### For Platform
- **Feature Differentiation**: Unique selling point vs. competitors
- **User Satisfaction**: More gifting options = happier users
- **Scalability**: Handles both simple and complex gifting scenarios

## 🐛 Known Considerations

1. **Existing Items**: All existing items default to `allow_group_gifting = false`
   - Users must explicitly enable group gifting on items they want

2. **Database Constraint**: If `claims_item_id_key` constraint exists:
   - Frontend check prevents duplicate claims for single-claim items
   - Group gifting won't work until constraint is removed
   - See "Database Impact" section above for removal query

3. **Type Safety**: TypeScript type for `wishlist_items` may not include `allow_group_gifting`
   - Fixed with type casting in queries: `as Array<typeof data[0] & { allow_group_gifting?: boolean }>`
   - Will auto-resolve when Supabase types are regenerated

## 🔄 Future Enhancements

### Potential Additions
1. **Contribution Tracking**: Show progress bar for group-gifted items
2. **Contribution Limits**: Set max number of contributors
3. **Partial Payment UI**: Better UI for entering contribution amounts
4. **Thank You Notes**: Send thanks to all contributors for group gifts
5. **Item Status Indicators**: Badge showing "Group Gift Available" on public view

### Already Implemented (Commented Out)
- Group gifting UI with partial payment option in `ClaimItemDialog`
- Requires additional database columns: `is_group_gift`, `contribution_amount`
- Can be re-enabled after running full feature migrations

## ✅ Testing Checklist

- [ ] Migration applied successfully
- [ ] Can create items with "Single Person" mode
- [ ] Can create items with "Group Gifting" mode
- [ ] Single-claim items block second claim
- [ ] Group gifting items allow multiple claims
- [ ] Can edit existing items to change claim type
- [ ] UI displays correctly in both add/edit dialogs
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Mobile responsive (radio groups stack nicely)

## 📞 Support

If you encounter issues:
1. Check that migration was applied: `SELECT * FROM wishlist_items LIMIT 1;`
2. Verify `allow_group_gifting` column exists
3. Check browser console for errors
4. Ensure Supabase RLS policies allow reading `allow_group_gifting`

---

**Status**: ✅ Implemented and ready to test
**Next Step**: Run the database migration!

