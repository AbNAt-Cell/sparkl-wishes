# Wallet Feature Documentation

## Overview

The Sparkl Wishes platform now includes a complete wallet system that allows wishlist owners to receive, track, and withdraw funds when people pay for their wishlist items via Paystack.

---

## Features

### ✅ For Wishlist Owners

1. **Automatic Wallet Creation**: Wallets are automatically created when someone makes a payment on your wishlist
2. **Real-time Balance Updates**: See your balance update immediately after payments
3. **Dashboard Integration**: View your wallet balance directly on the dashboard
4. **Transaction History**: Track all incoming payments and withdrawals
5. **Easy Withdrawals**: Withdraw funds directly to your Nigerian bank account via Paystack

### ✅ For Gift Givers

1. **Secure Payments**: Pay for wishlist items securely via Paystack
2. **Multiple Payment Methods**: Card, bank transfer, USSD, and mobile money
3. **Instant Confirmation**: Receive immediate confirmation after successful payment
4. **Anonymous Gifting**: Option to remain anonymous when claiming items

---

## How It Works

### Payment Flow

```
1. Guest visits shared wishlist → Claims an item
2. Enters details and clicks "Claim Item"
3. Paystack payment modal opens
4. Guest completes payment
5. System automatically:
   - Marks item as claimed
   - Creates/updates wishlist owner's wallet
   - Adds funds to wallet balance
   - Creates transaction record
   - Notifies both parties
```

### Withdrawal Flow

```
1. Wishlist owner navigates to Wallet page
2. Clicks "Withdraw" button
3. Enters amount and bank details
4. System creates withdrawal transaction
5. Funds transferred via Paystack (1-2 business days)
```

---

## Technical Implementation

### Database Schema

The wallet system uses two main tables:

#### `user_wallets`
- `id` (uuid): Wallet ID
- `user_id` (uuid): Owner's user ID
- `currency` (string): Wallet currency (USD, NGN, etc.)
- `balance` (decimal): Current balance
- `created_at`, `updated_at` (timestamp)

#### `wallet_transactions`
- `id` (uuid): Transaction ID
- `wallet_id` (uuid): Reference to wallet
- `type` (string): "credit" or "debit"
- `amount` (decimal): Transaction amount
- `status` (string): "pending", "completed", "failed"
- `reference` (string): Payment reference
- `claim_id` (uuid): Associated claim (for credits)
- `description` (string): Transaction description
- `created_at` (timestamp)

### Key Components

#### 1. **ClaimItemDialog** (`src/components/ClaimItemDialog.tsx`)
- Handles the payment process
- Integrates with Paystack
- Automatically credits wallet on successful payment
- Creates transaction records

#### 2. **Wallet Page** (`src/pages/Wallet.tsx`)
- Displays wallet balance(s)
- Shows transaction history
- Provides withdrawal interface
- Supports multiple currencies

#### 3. **Dashboard Integration** (`src/pages/Dashboard.tsx`)
- Shows wallet balance card when funds are available
- Quick link to wallet page
- Visual indicator for available funds

---

## Setup Instructions

### Environment Variables

Add to your `.env` file:

```bash
# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
```

Get your Paystack key from: https://dashboard.paystack.com/#/settings/developers

### Supabase Configuration

The wallet tables should already exist in your database. If not, run the migrations in `supabase/migrations/`.

Ensure Row Level Security (RLS) policies allow:
- Users to read their own wallets
- Users to read their own wallet transactions
- System to create/update wallets and transactions

---

## Usage Guide

### For Users

#### Viewing Your Wallet

1. Log in to your account
2. Click on your profile icon in the top right
3. Select "Wallet" from the dropdown

OR

1. From the Dashboard, click the wallet balance card (if you have funds)

#### Withdrawing Funds

1. Navigate to Wallet page
2. Click "Withdraw" button
3. Enter withdrawal details:
   - Amount (minimum 100)
   - Bank name
   - Account number (10 digits)
   - Account name
4. Review and confirm
5. Funds will arrive in 1-2 business days

#### Minimum Withdrawal

- **Minimum Amount**: 100 NGN (or equivalent in other currencies)
- **Maximum Amount**: Your available balance
- **Processing Time**: 1-2 business days

### For Gift Givers

#### Making a Payment

1. Visit the shared wishlist link
2. Click "Claim" on an available item
3. Fill in your details:
   - Name
   - Email
   - Phone number
   - Optional notes
   - Check "anonymous" if you want to hide your name
4. Click "Claim Item"
5. Complete payment via Paystack
6. Receive confirmation

---

## Payment Methods Supported

Via Paystack:
- ✅ Debit/Credit Cards (Visa, Mastercard, Verve)
- ✅ Bank Transfer
- ✅ USSD
- ✅ Mobile Money
- ✅ Bank Account
- ✅ QR Code

---

## Security Features

1. **Secure Payment Processing**: All payments handled by Paystack (PCI DSS compliant)
2. **Environment Variables**: Sensitive keys stored in environment variables
3. **Transaction Verification**: Every payment is verified before crediting wallet
4. **Bank Account Validation**: Account numbers validated before withdrawal
5. **Rate Limiting**: API rate limits prevent abuse
6. **Audit Trail**: All transactions logged with references

---

## Error Handling

### Common Errors

**"Payment system not loaded"**
- **Cause**: Paystack script didn't load
- **Solution**: Refresh the page and try again

**"Insufficient funds"**
- **Cause**: Trying to withdraw more than available balance
- **Solution**: Enter an amount equal to or less than your balance

**"Minimum withdrawal amount is 100"**
- **Cause**: Trying to withdraw less than minimum
- **Solution**: Accumulate at least 100 in your wallet

**"Payment received but wallet update failed"**
- **Cause**: Payment succeeded but wallet update encountered an error
- **Solution**: Contact support immediately with the payment reference

---

## Testing

### Test Mode

The platform uses Paystack test keys by default. Use these test cards:

**Successful Payment:**
- Card Number: `4084 0840 8408 4081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Failed Payment:**
- Card Number: `5060 6666 6666 6666`
- CVV: Any 3 digits
- Expiry: Any future date

### Test Bank Accounts

For testing withdrawals:
- Account Number: `0123456789`
- Bank: Any Nigerian bank

---

## API Integration

### Creating Wallet Programmatically

```typescript
const { data: wallet, error } = await supabase
  .from("user_wallets")
  .insert({
    user_id: userId,
    currency: "NGN",
    balance: 0,
  })
  .select()
  .single();
```

### Creating Transaction

```typescript
const { error } = await supabase
  .from("wallet_transactions")
  .insert({
    wallet_id: walletId,
    type: "credit", // or "debit"
    amount: 1000,
    status: "completed",
    reference: "unique_ref_123",
    description: "Payment for wishlist item",
  });
```

### Updating Balance

```typescript
const { error } = await supabase
  .from("user_wallets")
  .update({
    balance: newBalance,
    updated_at: new Date().toISOString(),
  })
  .eq("id", walletId);
```

---

## Future Enhancements

### Planned Features

1. **Multi-currency Support**: Automatic currency conversion
2. **Withdrawal to Multiple Banks**: Add multiple bank accounts
3. **Withdrawal History**: Detailed withdrawal tracking
4. **Email Notifications**: Notify on payments and withdrawals
5. **Stripe Integration**: Alternative payment method
6. **Wallet Reports**: Monthly/yearly financial reports
7. **Auto-withdrawal**: Automatically withdraw when balance reaches threshold
8. **Referral Bonuses**: Earn credits for referring users

---

## Troubleshooting

### Wallet Not Showing

**Problem**: Wallet page shows "No wallet yet"
**Solution**: 
1. Create a wishlist
2. Have someone make a payment
3. Wallet will be created automatically

### Balance Not Updating

**Problem**: Made a payment but balance didn't update
**Solution**:
1. Check transaction history on wallet page
2. Verify payment was completed in Paystack dashboard
3. Contact support if payment succeeded but balance didn't update

### Withdrawal Pending

**Problem**: Withdrawal status stuck on "pending"
**Solution**:
1. Wait 1-2 business days (normal processing time)
2. Check Paystack dashboard for transfer status
3. Contact support if longer than 3 business days

---

## Support

### Contact Information

For wallet-related issues:
1. Check transaction reference number
2. Take screenshots of errors
3. Contact support with:
   - Your account email
   - Transaction reference
   - Timestamp of issue
   - Screenshot if possible

---

## Changelog

### Version 1.0.0 (Current)
- ✅ Initial wallet system implementation
- ✅ Paystack payment integration
- ✅ Automatic wallet creation
- ✅ Transaction history
- ✅ Withdrawal functionality
- ✅ Dashboard integration
- ✅ Multi-currency support

---

## License

This wallet feature is part of the Sparkl Wishes platform and follows the same license terms.

---

## Credits

- **Payment Gateway**: Paystack (https://paystack.com)
- **Database**: Supabase
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

---

**Last Updated**: October 31, 2025

