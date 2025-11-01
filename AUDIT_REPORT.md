# Sparkl Wishes - Codebase Audit Report
**Date:** October 31, 2025  
**Auditor:** Senior Developer Review

---

## 🔴 CRITICAL ISSUES (Fix Immediately)

### 1. **SECURITY BREACH: Hardcoded API Keys**
**Location:** `src/integrations/supabase/client.ts` (Lines 5-6)
**Severity:** CRITICAL ⚠️

**Issue:**
```typescript
const SUPABASE_URL = "https://ruzknsqkkbzyleqmmboc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

These should be environment variables. While the anon key is generally safe to expose, hardcoding it prevents environment-specific configurations.

**Impact:** 
- Cannot use different databases for dev/staging/prod
- Version control exposure
- Key rotation difficulties

**Fix:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

---

### 2. **SECURITY: Hardcoded Payment Keys in Frontend**
**Location:** `src/components/ClaimItemDialog.tsx` (Lines 51-52)
**Severity:** CRITICAL ⚠️

**Issue:**
```typescript
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_51QYgYyP8ccfONcKJOIjlN09HcMhC0gKo8BdyPLMRAchz1jJPTzM1lxdpn6J5AEt6c7XNgqOLQ8wJZ1Sq0qcYqE2F00JnOOhMjL";
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_b9c4a5d4a6f4c4e4f4c4e4f4c4e4f4c4";
```

Fallback keys are hardcoded test keys exposed in source code.

**Impact:**
- Security risk if keys are ever live keys
- Cannot enforce environment variables
- Keys visible in production bundle

**Fix:** Remove fallback keys entirely and fail fast if missing:
```typescript
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

if (!STRIPE_PUBLIC_KEY || !PAYSTACK_PUBLIC_KEY) {
  throw new Error("Payment keys not configured");
}
```

---

### 3. **CRITICAL BUG: Incomplete Payment Implementation**
**Location:** `src/components/ClaimItemDialog.tsx` (Lines 68-95)
**Severity:** CRITICAL 🐛

**Issue:**
Stripe payment is mocked and not actually processing payments:
```typescript
// Line 75: This is not a real payment!
toast.success("Stripe payment integration ready. Backend needed for checkout.");

// Line 78-85: Marking as completed without actual payment
await supabase.from("claims").update({
  payment_status: "completed",
  payment_method: "stripe",
  payment_reference: `stripe_${Date.now()}`,
})
```

**Impact:**
- Users think they've paid but haven't
- Revenue loss
- Legal/compliance issues
- Fraud vulnerability

**Fix:** Implement proper Stripe payment flow with backend payment intent creation

---

### 4. **DATA INTEGRITY: Inconsistent Claim Status Checking**
**Location:** Multiple files
**Severity:** HIGH 🐛

**Issue in `WishlistDetail.tsx` (Lines 414-418):**
```typescript
const completedClaim = item.claims && (Array.isArray(item.claims) 
  ? item.claims.find((c: any) => c.payment_status === 'completed' || c.payment_status === 'not_required')
  : (item.claims as any).payment_status === 'completed' || (item.claims as any).payment_status === 'not_required');
```

**Issue in `SharedWishlist.tsx` (Lines 150-151):**
```typescript
const claims = Array.isArray(item.claims) ? item.claims : item.claims ? [item.claims] : [];
const isClaimed = claims.length > 0; // This doesn't check payment_status!
```

**Impact:**
- SharedWishlist shows items as "Claimed" even if payment is pending
- Inconsistent UX between owner and public view
- Items with expired/pending claims show as unavailable

**Fix:** Standardize claim checking logic across all components

---

## 🟡 HIGH PRIORITY ISSUES

### 5. **UX: Using window.confirm() Instead of UI Components**
**Location:** `src/pages/Dashboard.tsx` (Line 67)
**Severity:** HIGH 📱

**Issue:**
```typescript
if (!confirm("Are you sure you want to delete this wishlist?")) {
  return;
}
```

Already have AlertDialog imported but not using it!

**Impact:**
- Inconsistent UI/UX
- Unprofessional appearance
- Poor mobile experience
- Breaks design system

**Fix:** Use the already-imported AlertDialog component

---

### 6. **UX: Confusing Two-Step Payment Flow**
**Location:** `src/components/ClaimItemDialog.tsx`
**Severity:** HIGH 📱

**Issue:**
User must first "claim" the item, THEN pay in a separate step. The dialog doesn't close after claiming, which is confusing.

**Current Flow:**
1. Fill form → Click "Claim Item"
2. Shows success toast
3. Dialog stays open with "Pay now" button
4. Click pay button

**Impact:**
- Users confused by multi-step process
- Higher abandonment rate
- Unclear what "claiming" does vs "paying"

**Fix:** Streamline to single-step: "Claim and Pay" with payment method selected upfront

---

### 7. **PERFORMANCE: No QueryClient Configuration**
**Location:** `src/App.tsx` (Line 16)
**Severity:** HIGH ⚡

**Issue:**
```typescript
const queryClient = new QueryClient();
```

No configuration means:
- Default 5-minute cache time (may be too long/short)
- Default 3 retries on every failed query
- No global error handling
- Unnecessary network requests

**Impact:**
- Slower app experience
- Higher data costs for users
- Stale data issues
- No consistent error handling

**Fix:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        toast.error("Failed to fetch data");
      }
    },
  },
});
```

---

### 8. **PERFORMANCE: No Code Splitting / Lazy Loading**
**Location:** `src/App.tsx`
**Severity:** HIGH ⚡

**Issue:**
All pages imported at top level:
```typescript
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
// ... etc
```

**Impact:**
- Larger initial bundle size
- Slower first page load
- User downloads code for pages they may never visit

**Fix:** Implement React.lazy() for route-based code splitting

---

### 9. **BUG: Duplicate Auth State Management**
**Location:** Multiple pages
**Severity:** MEDIUM 🐛

**Issue:**
Every page duplicates this pattern:
```typescript
const [session, setSession] = useState<Session | null>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      setSession(session);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

**Impact:**
- Code duplication
- Potential race conditions
- Inconsistent auth state
- Multiple concurrent auth listeners

**Fix:** Create a custom `useAuth()` hook or React Context

---

### 10. **UX: 10-Minute Claim Expiration Too Short**
**Location:** `src/components/ClaimItemDialog.tsx` (Lines 175-177)
**Severity:** MEDIUM 📱

**Issue:**
```typescript
expires_at: itemPrice && itemPrice > 0 
  ? new Date(Date.now() + 10 * 60 * 1000).toISOString() 
  : null,
```

Claims expire in 10 minutes, but:
- No visible countdown timer
- No warning before expiration
- No way to extend
- No notification when expired

**Impact:**
- User frustration
- Payment failures
- Abandoned claims
- Poor conversion rates

**Fix:** 
- Increase to 30 minutes
- Add countdown timer
- Send email reminder
- Allow extension

---

## 🟠 MEDIUM PRIORITY ISSUES

### 11. **UX: No Error Boundaries**
**Location:** Entire app
**Severity:** MEDIUM 🐛

**Issue:** If any component throws an error, the entire app crashes with a white screen.

**Impact:**
- Poor user experience
- No error recovery
- No error reporting/tracking

**Fix:** Add Error Boundary components at key levels

---

### 12. **SECURITY: No URL Validation for External Links**
**Location:** `src/pages/WishlistDetail.tsx` (Line 468)
**Severity:** MEDIUM ⚠️

**Issue:**
```typescript
onClick={() => window.open(item.external_link!, "_blank")}
```

No validation that URL is safe (could be `javascript:`, `data:`, etc.)

**Impact:**
- XSS vulnerability
- Phishing risk
- Malicious redirects

**Fix:** Validate URLs before allowing:
```typescript
const isSafeUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

---

### 13. **BUG: Anonymous Claims Still Showing Partial Info**
**Location:** `src/pages/WishlistDetail.tsx` (Lines 438-442)
**Severity:** MEDIUM 🐛

**Issue:**
```typescript
{completedClaim && !completedClaim.is_anonymous && (
  <p className="text-xs text-muted-foreground mt-1">
    Claimed by: {completedClaim.claimer_name}
  </p>
)}
```

Logic inverted - this shows info for NON-anonymous claims, but the badge is shown regardless.

**Impact:**
- Confusing UX
- Privacy concerns if anonymous claims have leaking data

---

### 14. **PERFORMANCE: Images Not Optimized**
**Location:** Throughout app
**Severity:** MEDIUM ⚡

**Issue:**
- No image compression
- No lazy loading
- No responsive images (srcset)
- No WebP/AVIF format support

**Impact:**
- Slow page loads
- High bandwidth usage
- Poor mobile experience

**Fix:** 
- Add image optimization service
- Implement lazy loading
- Use CDN with automatic format conversion

---

### 15. **UX: Missing Loading States**
**Location:** Multiple components
**Severity:** MEDIUM 📱

**Issue:**
Several actions have no loading states:
- Deleting wishlist (Dashboard.tsx)
- Adding items (WishlistDetail.tsx)
- Image uploads show loader but button isn't disabled

**Impact:**
- Users can double-click
- No feedback during operations
- Potential duplicate actions

---

### 16. **DATABASE: Wallet Tables Exist But Not Used**
**Location:** `src/integrations/supabase/types.ts`
**Severity:** MEDIUM 🗄️

**Issue:**
Tables `user_wallets` and `wallet_transactions` exist in schema but are never used in the app.

**Impact:**
- Dead code
- Confusing for developers
- Unused database space
- Incomplete feature?

**Fix:** Either implement wallet feature or remove tables

---

### 17. **BUG: No Scheduled Job for Claim Expiration**
**Location:** `supabase/functions/expire-claims/index.ts`
**Severity:** MEDIUM 🐛

**Issue:**
Edge function exists to expire claims, but there's no cron job or scheduled trigger to run it.

**Impact:**
- Expired claims never actually expire
- Items stay "claimed" indefinitely
- Database bloat

**Fix:** Set up Supabase cron job or external scheduler

---

### 18. **UX: No Toast Notification for Expired Sessions**
**Location:** Auth handling throughout
**Severity:** MEDIUM 📱

**Issue:**
When session expires, user is silently redirected to auth page with no explanation.

**Impact:**
- User confusion
- Lost work
- Poor UX

**Fix:** Show toast "Session expired. Please sign in again."

---

## 🟢 LOW PRIORITY / NICE-TO-HAVE

### 19. **Missing React.StrictMode**
**Location:** `src/main.tsx`
**Severity:** LOW

StrictMode helps catch bugs early in development.

---

### 20. **No Accessibility (a11y) Attributes**
**Location:** Throughout
**Severity:** LOW

Missing ARIA labels, keyboard navigation improvements, screen reader support.

---

### 21. **No SEO Meta Tags**
**Location:** `index.html`
**Severity:** LOW

Missing Open Graph tags, Twitter cards, meta descriptions for shared links.

---

### 22. **Currency Symbol Position Inconsistent**
**Location:** Various
**Severity:** LOW

Some places show `$100`, others show `USD 100`, others show `100 USD`.

---

### 23. **No Form Validation Messages**
**Location:** All forms
**Severity:** LOW

Forms use HTML5 validation but no custom error messages.

---

### 24. **No Filtering/Sorting in Dashboard**
**Location:** `src/pages/Dashboard.tsx`
**Severity:** LOW

Users can't filter wishlists by event type or sort by date.

---

### 25. **Missing Profile Page Functionality**
**Location:** `src/pages/Profile.tsx` (not reviewed - timed out)
**Severity:** LOW

Profile page exists in routes but wasn't analyzed.

---

## 📋 PLAN OF ATTACK (Prioritized)

### Phase 1: CRITICAL FIXES (Do Immediately)
1. ✅ Create `.env.example` and move all API keys to environment variables
2. ✅ Fix Stripe payment - either implement properly or disable feature
3. ✅ Standardize claim status checking logic
4. ✅ Add proper error handling for payment failures
5. ✅ Set up Supabase RLS policies (if not already done)

### Phase 2: HIGH PRIORITY (Next Sprint)
6. ✅ Replace `window.confirm()` with AlertDialog
7. ✅ Refactor payment flow to single-step
8. ✅ Configure QueryClient with proper defaults
9. ✅ Implement route-based code splitting
10. ✅ Create `useAuth()` hook to centralize auth logic
11. ✅ Increase claim expiration time and add countdown

### Phase 3: MEDIUM PRIORITY (Following Sprint)
12. ✅ Add Error Boundaries
13. ✅ Implement URL validation
14. ✅ Fix anonymous claim display logic
15. ✅ Add image optimization
16. ✅ Add loading states to all actions
17. ✅ Set up claim expiration cron job
18. ✅ Add session expiration notifications

### Phase 4: POLISH (Nice-to-Have)
19. ✅ Add React.StrictMode
20. ✅ Improve accessibility
21. ✅ Add SEO meta tags
22. ✅ Standardize currency display
23. ✅ Add form validation messages
24. ✅ Add dashboard filtering/sorting
25. ✅ Review and enhance Profile page

---

## 🛠️ TECHNICAL DEBT

### Code Quality Issues
- **TypeScript**: Using `any` types in multiple places (claims checking)
- **DRY Violations**: Auth logic repeated across components
- **Magic Numbers**: Hardcoded values (10 minutes, etc.)
- **No Unit Tests**: No test files found
- **No E2E Tests**: No Playwright/Cypress tests

### Architecture Issues
- **No State Management**: Could benefit from Zustand/Jotai for global state
- **No API Layer**: Direct Supabase calls scattered throughout components
- **No Error Handling Service**: No centralized error tracking (Sentry, etc.)

---

## 📊 METRICS TO TRACK

After fixes, monitor:
1. **Payment Success Rate** - Should increase with better UX
2. **Claim Completion Rate** - Should improve with streamlined flow
3. **Page Load Time** - Should decrease with code splitting
4. **Error Rate** - Should decrease with error boundaries
5. **Session Duration** - Should increase with better UX

---

## 🎯 SUCCESS CRITERIA

Phase 1 Complete When:
- [ ] No hardcoded secrets in code
- [ ] Payments work end-to-end OR are disabled
- [ ] No data integrity issues with claims
- [ ] All critical security issues resolved

Phase 2 Complete When:
- [ ] All user-facing flows work smoothly
- [ ] App loads <2s on 3G
- [ ] No duplicate code for common operations
- [ ] Professional UI/UX throughout

Phase 3 Complete When:
- [ ] App never crashes for users
- [ ] All operations have proper feedback
- [ ] Data stays consistent
- [ ] Background jobs working

---

**END OF AUDIT REPORT**

