# Sparkl Wishes - Architecture & Data Flow

**Last Updated**: November 1, 2025

---

## 🏗️ Platform Architecture

### Core Concept

Sparkl Wishes is a **dual-interface platform**:
1. **Private Dashboard** - User's personal workspace (authenticated)
2. **Public Wishlist Page** - Shareable gift registry (public/anonymous)

---

## 🔐 Authentication & Authorization

### User Roles

**Authenticated Users (Wishlist Owners)**:
- Create and manage their own wishlists
- View their wallet balance
- Receive payments
- Withdraw funds
- Access: `/dashboard`, `/wishlist/:id` (own), `/wallet`, `/profile`

**Anonymous Users (Gift Givers)**:
- View public wishlists via share code
- Claim items
- Make payments
- Access: `/share/:shareCode` (public only)

---

## 📊 Data Isolation & Security

### Critical: User Data Separation

**FIXED BUG** (Nov 1, 2025):
- ❌ **Before**: Dashboard was fetching ALL wishlists from database
- ✅ **After**: Dashboard now filters by `user_id`

```typescript
// CORRECT - Private Dashboard
const { data: wishlists } = await supabase
  .from("wishlists")
  .select("*")
  .eq("user_id", session.user.id)  // ← CRITICAL: Filter by current user
  .order("created_at", { ascending: false });

// CORRECT - Public Shared Page
const { data: wishlist } = await supabase
  .from("wishlists")
  .select("*")
  .eq("share_code", shareCode)
  .eq("is_public", true)  // ← CRITICAL: Only public wishlists
  .single();
```

### Data Access Matrix

| Resource | Owner (Private) | Guest (Public) | Query Filter |
|----------|----------------|----------------|--------------|
| **Wishlists** | Own only | Via share_code + is_public | `user_id` or `share_code` |
| **Items** | All items | Unclaimed or own claims | `wishlist_id` |
| **Claims** | All on own lists | Own claims only | `wishlist_id` or `claimer_email` |
| **Wallet** | Own wallet | None | `user_id` |
| **Transactions** | Own only | None | `wallet_id` |
| **Profile** | Own + public profiles | Public profiles | `id` |

---

## 🗺️ Route Structure

### Private Routes (Authenticated)

```
/dashboard              → User's wishlists (filtered by user_id)
/create-wishlist        → Create new wishlist
/wishlist/:id           → Edit/manage own wishlist (owner view)
/wallet                 → User's wallet & transactions
/profile                → Edit own profile
```

**Authorization**: Requires `session.user.id`  
**Data Scope**: Only current user's data

---

### Public Routes (No Auth Required)

```
/                       → Landing page
/auth                   → Sign in / Sign up
/share/:shareCode       → Public wishlist view (gift givers)
```

**Authorization**: None required  
**Data Scope**: Only `is_public = true` wishlists

---

### Shared Routes (Context-Dependent)

```
/wishlist/:id           → Owner view (if user_id matches) OR
                          Redirect to /share/:shareCode (if not owner)
```

---

## 🔄 Data Flow Diagrams

### 1. Wishlist Creation Flow

```
User clicks "Create Wishlist"
    ↓
Enters: title, event_type, event_date, currency, description
    ↓
Submit → Insert into wishlists table
    {
      user_id: session.user.id,  ← Tied to current user
      title: "...",
      share_code: generated_code, ← Unique public identifier
      is_public: true,
      ...
    }
    ↓
Redirect to /wishlist/:id (Owner View)
```

**Key Point**: `user_id` establishes ownership

---

### 2. Viewing Wishlists

#### Private Dashboard View

```
User visits /dashboard
    ↓
Query: SELECT * FROM wishlists 
       WHERE user_id = current_user_id  ← CRITICAL
    ↓
Display: Only user's own wishlists
    - Can edit, delete, manage items
    - See all claims (even anonymous)
    - View full financial data
```

#### Public Shared View

```
Guest visits /share/:shareCode
    ↓
Query: SELECT * FROM wishlists 
       WHERE share_code = :shareCode 
       AND is_public = true  ← CRITICAL
    ↓
Display: Read-only wishlist view
    - Can claim unclaimed items
    - Cannot edit anything
    - Can see other claims (names if not anonymous)
```

---

### 3. Claiming Items Flow

```
Guest on /share/:shareCode clicks "Claim"
    ↓
Enters: name, email, phone, notes
Optional: Check "anonymous"
    ↓
Create claim:
    {
      item_id: selected_item_id,
      claimer_name: "...",
      claimer_email: "...",
      is_anonymous: true/false,
      payment_status: "pending",
    }
    ↓
If item has price:
    → Open Paystack payment modal
    → On success: payment_status = "completed"
    → Credit wishlist owner's wallet
    ↓
If no price:
    → payment_status = "not_required"
    → Mark as claimed immediately
```

**Key Point**: Claims are anonymous to other guests, but owner sees all details

---

### 4. Payment & Wallet Flow

```
Payment Successful (Paystack)
    ↓
1. Update claim: payment_status = "completed"
    ↓
2. Get wishlist owner_id from item → wishlist → user_id
    ↓
3. Get/Create wallet for owner:
   INSERT INTO user_wallets (user_id, currency, balance)
   ON CONFLICT DO NOTHING
    ↓
4. Credit wallet:
   UPDATE user_wallets 
   SET balance = balance + amount
   WHERE user_id = owner_id
    ↓
5. Create transaction record:
   INSERT INTO wallet_transactions
   (wallet_id, type: "credit", amount, claim_id, reference)
    ↓
Owner can now withdraw via /wallet
```

---

## 🔒 Database Row Level Security (RLS)

### Critical Policies

**Wishlists Table**:
```sql
-- Users can view their own wishlists
CREATE POLICY "users_view_own_wishlists"
ON wishlists FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view public wishlists
CREATE POLICY "anyone_view_public_wishlists"
ON wishlists FOR SELECT
USING (is_public = true);

-- Users can only insert/update/delete their own
CREATE POLICY "users_manage_own_wishlists"
ON wishlists FOR ALL
USING (auth.uid() = user_id);
```

**Wishlist Items**:
```sql
-- Users can manage items on their own wishlists
CREATE POLICY "users_manage_own_items"
ON wishlist_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM wishlists 
    WHERE wishlists.id = wishlist_items.wishlist_id 
    AND wishlists.user_id = auth.uid()
  )
);

-- Anyone can view items on public wishlists
CREATE POLICY "anyone_view_public_items"
ON wishlist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM wishlists 
    WHERE wishlists.id = wishlist_items.wishlist_id 
    AND wishlists.is_public = true
  )
);
```

**Claims**:
```sql
-- Anyone can create claims
CREATE POLICY "anyone_can_claim"
ON claims FOR INSERT
WITH CHECK (true);

-- Wishlist owners can view all claims on their items
CREATE POLICY "owners_view_claims"
ON claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM wishlist_items wi
    JOIN wishlists w ON w.id = wi.wishlist_id
    WHERE wi.id = claims.item_id
    AND w.user_id = auth.uid()
  )
);

-- Public can view claims (to see if item is taken)
-- But sensitive data hidden via is_anonymous flag
CREATE POLICY "public_view_claims"
ON claims FOR SELECT
USING (true);
```

**Wallets & Transactions**:
```sql
-- Users can only access their own wallet
CREATE POLICY "users_access_own_wallet"
ON user_wallets FOR ALL
USING (auth.uid() = user_id);

-- Users can only see their own transactions
CREATE POLICY "users_view_own_transactions"
ON wallet_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_wallets 
    WHERE user_wallets.id = wallet_transactions.wallet_id 
    AND user_wallets.user_id = auth.uid()
  )
);
```

---

## 🎯 Page-by-Page Breakdown

### `/dashboard` (Private)

**Purpose**: User's personal control center  
**Auth**: Required  
**Data**: 
- Current user's wishlists only (`WHERE user_id = session.user.id`)
- Current user's wallet balance

**Actions**:
- Create new wishlist
- View wishlist details
- Delete wishlist (with confirmation)
- Navigate to wallet

**Security**:
- Cannot see other users' wishlists
- Cannot delete other users' wishlists (double-check with `user_id`)

---

### `/wishlist/:id` (Owner View)

**Purpose**: Manage specific wishlist  
**Auth**: Required (must be owner)  
**Data**:
- Wishlist details (if `user_id` matches)
- All items
- All claims (including anonymous claimer details)

**Actions**:
- Add items
- Edit wishlist (TODO)
- Edit items (TODO)
- Delete items (TODO)
- Share link
- View claim details

**Security**:
- Must verify `session.user.id === wishlist.user_id`
- If not owner, redirect to `/share/:shareCode` or show 404

---

### `/share/:shareCode` (Public)

**Purpose**: Gift givers view & claim items  
**Auth**: Not required  
**Data**:
- Wishlist details (if `is_public = true`)
- All items
- Claims (basic info, respects `is_anonymous`)

**Actions**:
- View items
- Claim unclaimed items
- Make payments

**Security**:
- Only show if `is_public = true`
- Hide sensitive claim info if `is_anonymous = true`
- Cannot edit anything
- Cannot see financial details

---

### `/wallet` (Private)

**Purpose**: View earnings & withdraw  
**Auth**: Required  
**Data**:
- User's wallet(s) (`WHERE user_id = session.user.id`)
- User's transactions only

**Actions**:
- View balance
- View transaction history
- Withdraw to bank account

**Security**:
- Can only see own wallet
- Can only withdraw from own wallet

---

## 🐛 Bug Fixes Applied (Nov 1, 2025)

### 1. Privacy Leak: Dashboard Showing All Wishlists

**Issue**: 
```typescript
// BAD - Fetched ALL wishlists
.select("*")
.order("created_at", { ascending: false });
```

**Fix**:
```typescript
// GOOD - Filter by current user
.select("*")
.eq("user_id", session.user.id)
.order("created_at", { ascending: false });
```

**Impact**: 
- Users could see "Nana's Birthday" and all other users' wishlists
- Major privacy violation
- Fixed immediately

---

### 2. Delete Using window.confirm()

**Issue**: Used native browser confirm dialog

**Fix**: Implemented proper AlertDialog component
- Better UX
- Consistent with design system
- More informative warning
- Double-check ownership with `user_id` filter

---

## 📋 Data Validation Checklist

Before any data operation, verify:

### Creating Resources
- [ ] `user_id` set to `session.user.id`
- [ ] User is authenticated
- [ ] Required fields present

### Reading Resources  
- [ ] Filter by `user_id` for private data
- [ ] Check `is_public` for shared data
- [ ] Respect `is_anonymous` flag

### Updating Resources
- [ ] Verify ownership (`user_id` matches)
- [ ] User has permission
- [ ] Validate input data

### Deleting Resources
- [ ] Verify ownership
- [ ] Confirmation dialog shown
- [ ] Cascade deletes handled properly

---

## 🔍 Testing Scenarios

### Test: Data Isolation

1. **Create two users: Alice & Bob**
2. Alice creates "Alice's Wedding" wishlist
3. Bob creates "Bob's Birthday" wishlist
4. Alice logs in → Dashboard should show ONLY "Alice's Wedding"
5. Bob logs in → Dashboard should show ONLY "Bob's Birthday"
6. Alice visits `/share/:bob_code` → Can see Bob's wishlist (public)
7. Alice visits `/wishlist/:bob_id` → Should be blocked or redirected

---

### Test: Claim Privacy

1. Alice creates wishlist with items
2. Bob (guest) claims item as "Bob Smith" (not anonymous)
3. Charlie (guest) claims item anonymously
4. Alice (owner) sees both: "Bob Smith" and Charlie's full details
5. Bob visits Alice's shared wishlist → Sees his claim + "Claimed anonymously"
6. Charlie visits → Sees "Bob Smith" + "Claimed anonymously" (not his details)

---

### Test: Wallet Security

1. Alice's wishlist receives payment
2. Funds go to Alice's wallet (NOT Bob's or Charlie's)
3. Bob cannot access Alice's wallet
4. Alice cannot see Bob's transactions
5. Alice can only withdraw from her own wallet

---

## 🚨 Security Checklist

- [x] Dashboard filters by `user_id`
- [x] Delete operations verify ownership
- [x] Shared wishlists only show if `is_public = true`
- [x] Wallet operations restricted to owner
- [x] Claims respect `is_anonymous` flag
- [ ] TODO: Edit operations verify ownership
- [ ] TODO: Email verification enforced
- [ ] TODO: Rate limiting on payments
- [ ] TODO: Audit logs for sensitive operations

---

## 📱 User Experience Flow

### New User Journey

```
Sign Up → Email Verification (TODO) → Dashboard (empty)
    ↓
"Create Your First Wishlist" CTA
    ↓
Create Wishlist Form → Add Items → Share Link
    ↓
Guest Claims Item → Payment → Owner Sees Notification (TODO)
    ↓
Owner Checks Wallet → Withdraw Funds
```

### Returning User Journey

```
Sign In → Dashboard (shows wishlists)
    ↓
Click Wishlist → Manage Items → Check Claims
    ↓
Click Wallet → View Balance → Withdraw
```

---

## 🎯 Key Takeaways

1. **Private Dashboard** = User's own data only (`user_id` filter)
2. **Public Page** = Shareable via `share_code` (must be `is_public`)
3. **Ownership** = Always verify `user_id` before edit/delete
4. **Privacy** = Respect `is_anonymous` flag for guests
5. **Wallet** = Tied to wishlist owner, not claimer

---

## 🔄 Next Steps

1. ✅ Fix dashboard user isolation
2. ✅ Fix delete confirmation dialog
3. TODO: Add edit wishlist functionality
4. TODO: Add edit/delete items functionality
5. TODO: Implement email notifications
6. TODO: Add ownership verification middleware

---

**Questions? Refer to this document when implementing new features!**

