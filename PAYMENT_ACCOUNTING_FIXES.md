# Payment and Accounting Fixes

## Critical Issues Fixed

### 1. Payment Completion Trigger (CRITICAL BUG)

**Problem**: The migration `20251103000200_update_payment_completion_fee.sql` replaced the payment completion function but **removed all group gifting logic**:
- ❌ Didn't check `is_group_gift` field
- ❌ Ignored `contribution_amount` for group gifts
- ❌ Always credited `item_price` instead of actual contribution
- ❌ Hardcoded currency to 'USD'
- ❌ Platform fees applied incorrectly to group gifts

**Fix**: Created new migration `20251104000000_fix_payment_trigger_and_accounting.sql` that:
- ✅ Properly handles both single and group gifts
- ✅ Uses `contribution_amount` for group gifts, `item_price` for single gifts
- ✅ Respects wishlist currency (not hardcoded)
- ✅ Applies platform fees correctly to the actual payment amount
- ✅ Credits wallet with net amount (after fees)
- ✅ Records transactions with proper descriptions

### 2. Item Claiming Logic

**Problem**: The `isItemClaimed()` function only checked if ANY claim was completed, which caused:
- ❌ Group gifts showing as "claimed" even if only partially funded
- ❌ Items marked as claimed when only $10 of $100 was contributed

**Fix**: Updated `isItemClaimed()` function in `src/lib/utils.ts`:
- ✅ For single gifts: checks if any claim is completed (original behavior)
- ✅ For group gifts: checks if total contributions >= price_max
- ✅ Requires item data to determine if it's a group gift

### 3. Database Queries

**Problem**: Queries weren't fetching the required fields for group gift logic:
- ❌ Missing `contribution_amount` from claims
- ❌ Missing `is_group_gift` from claims

**Fix**: Updated queries in:
- ✅ `src/pages/WishlistDetail.tsx` - Now selects `contribution_amount` and `is_group_gift`
- ✅ `src/pages/SharedWishlist.tsx` - Now selects `contribution_amount` and `is_group_gift`

## Migration Instructions

1. **Apply the new migration**:
   ```bash
   # The migration file is: supabase/migrations/20251104000000_fix_payment_trigger_and_accounting.sql
   # Apply it through your Supabase dashboard or CLI
   ```

2. **Verify the trigger**:
   ```sql
   -- Check that the function exists and handles both cases
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname = 'handle_payment_completion';
   ```

## How It Works Now

### Single Gift Flow:
1. User claims item → creates claim with `is_group_gift = false`
2. User pays full `item_price`
3. Trigger credits wallet with: `item_price - platform_fee`
4. Item marked as "claimed" when payment_status = 'completed'

### Group Gift Flow:
1. User claims item → creates claim with `is_group_gift = true`, `contribution_amount = X`
2. User pays `contribution_amount`
3. Trigger credits wallet with: `contribution_amount - platform_fee`
4. Item marked as "claimed" when `SUM(contribution_amounts) >= price_max`

## Testing Checklist

- [ ] Test single gift payment - verify correct amount credited (with fees)
- [ ] Test group gift partial contribution - verify contribution_amount credited
- [ ] Test group gift multiple contributions - verify item marked claimed when fully funded
- [ ] Test currency handling - verify wallet uses correct currency
- [ ] Test platform fees - verify fees are calculated and deducted correctly
- [ ] Test transaction records - verify descriptions are accurate

## Files Changed

1. `supabase/migrations/20251104000000_fix_payment_trigger_and_accounting.sql` (NEW)
2. `src/lib/utils.ts` - Updated `isItemClaimed()` function
3. `src/pages/WishlistDetail.tsx` - Updated queries and function calls
4. `src/pages/SharedWishlist.tsx` - Updated queries and function calls

## Notes

- The old broken trigger (`20251103000200_update_payment_completion_fee.sql`) is replaced by the new migration
- All existing payments will continue to work - no data migration needed
- Group gifts that were incorrectly showing as "claimed" will now show correct status after the fix

