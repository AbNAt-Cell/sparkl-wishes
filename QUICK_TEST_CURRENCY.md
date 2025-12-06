# Quick Test: Currency Conversion

## What to Do

1. **Open the app and go to Wallet page**
2. **Open DevTools** (F12) and go to Console tab
3. **Look for these logs** (in order):

```
Wallet conversion state: {
  walletExists: true,
  walletBalance: [SOME_NUMBER],
  walletCurrency: "USD",
  displayCurrency: "[DETECTED_CURRENCY]",
  convertedBalance: [CONVERTED_NUMBER],
  detectedCurrency: "[DETECTED_CURRENCY]",
  isAutoDetected: true/false
}
```

4. **Check the math** - Example:
   - If walletBalance = 100
   - If displayCurrency = NGN (rate 1550)
   - Then convertedBalance should be ≈ 155000

5. **Look for conversion logs** like:
```
Converting 100 from USD to NGN
Rates - From: USD=1, To: NGN=1550
Converted amount: 155000
```

6. **In the UI**, the balance should display in the converted currency

## If It Shows 0 or Wrong Amount

**Try these:**

1. Check if `walletBalance: 0` - means wallet has no funds
2. Check if `convertedBalance: 0` - conversion might have failed
3. Look for warning logs like "Exchange rate not found"
4. Check `displayCurrency` - is it what you expect?

## Try Changing Currency

1. Click the currency dropdown at the top
2. Select a different currency
3. Watch the balance change instantly
4. Check console for: "Setting currency manually to: [NEW_CURRENCY]"

## Expected Behavior After Changes

✅ Balance updates when currency changes
✅ Console shows conversion logs
✅ Original amount appears when currencies differ
✅ After refresh, currency persists (if manually selected)
