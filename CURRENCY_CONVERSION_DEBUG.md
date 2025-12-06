# Debugging Currency Conversion in Wallet

## What Should Happen

1. **On page load:**
   - Currency is auto-detected (or uses manual selection) from IP
   - Wallet data is fetched from database
   - Exchange rates are fetched from API (with fallback to hardcoded rates)
   - Balance is converted from wallet currency (USD) to display currency

2. **Visual Display:**
   - Shows converted balance in large text
   - Shows display currency code (e.g., "NGN")
   - If wallet currency ≠ display currency, shows original: "Original: $100.00"

## Debug Checklist

### Step 1: Check Console Logs
Open DevTools (F12) → Console and look for:

```
Attempting IP detection via ipapi.co
Using detected currency: [CURRENCY_CODE]
Fetching fresh exchange rates...
Fresh exchange rates fetched successfully: [NUMBER] currencies
Converting [AMOUNT] from USD to [DISPLAY_CURRENCY]
Rates - From: USD=1, To: [DISPLAY_CURRENCY]=[RATE]
Converted amount: [CONVERTED_VALUE]
```

### Step 2: Check Wallet Component State
In Console, you should see:
```
Wallet component state: {
  walletExists: true/false,
  walletBalance: [NUMBER],
  walletCurrency: "USD",
  displayCurrency: "[CURRENCY_CODE]",
  convertedBalance: [CONVERTED_NUMBER],
  detectedCurrency: "[CURRENCY_CODE]"
}
```

### Step 3: Verify Conversion Math
If wallet has $100 and display currency is NGN (rate 1550):
- Expected: 100 × 1550 = 155,000
- Should show: ₦155,000

### Step 4: Manual Currency Change
1. On Wallet page, select different currency from dropdown
2. Check console for: "Setting currency manually to: [NEW_CURRENCY]"
3. Balance should update instantly to new currency conversion

## Common Issues & Fixes

### Issue: Shows 0 or blank amount
**Check:**
- Is `walletExists: true` in console?
- Is `walletBalance` a number > 0?
- Check network tab → API calls working?

**Fix:**
- Make sure user is logged in
- Check if wallet data exists in database
- Verify exchange rate API is responding

### Issue: Shows wrong amount
**Check:**
- Is correct `walletCurrency` showing?
- Is correct `displayCurrency` showing?
- Are exchange rates loaded? Check "Rates - From:" log

**Fix:**
- Try refreshing page
- Check if rates are being fetched from API
- Falls back to hardcoded rates if API fails

### Issue: Original amount not showing
**Check:**
- Is `wallet?.currency` defined?
- Is `wallet.currency !== displayCurrency` true?

**Fix:**
- This is expected if wallet currency = display currency
- Only shows when currencies differ

## Test Cases

### Test 1: USD Wallet → USD Display
- Expected: No conversion, same amount
- "Original" note: Should NOT appear

### Test 2: USD Wallet → NGN Display  
- Wallet shows: $100
- Display should show: ₦155,000 (or current rate)
- "Original" note: Should show "$100.00"

### Test 3: Change Currency Manually
- Select different currency from dropdown
- Amount should update instantly
- "Original" note should update

### Test 4: Refresh Page
- Balance should persist
- Manually selected currency should persist
- Original amount should still show if currencies differ

## Files Modified

- `src/hooks/useCurrencyConversion.ts` - Currency conversion logic with detailed logging
- `src/pages/Wallet.tsx` - Imports and uses conversion hook with debug logging
