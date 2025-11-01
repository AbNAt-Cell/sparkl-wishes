-- ============================================================================
-- SPARKL WISHES - ALL NEW FEATURES MIGRATIONS
-- Apply this in Supabase Dashboard > SQL Editor
-- Date: November 2, 2025
-- ============================================================================

-- ============================================================================
-- 1. GUEST BOOK / COMMENTS
-- ============================================================================

-- Create wishlist_comments table
CREATE TABLE IF NOT EXISTS public.wishlist_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid REFERENCES public.wishlists(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  commenter_name text NOT NULL,
  commenter_email text,
  comment_text text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_comments_wishlist ON public.wishlist_comments(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_comments_item ON public.wishlist_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.wishlist_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.wishlist_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Comments are viewable by everyone"
  ON public.wishlist_comments FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can create comments"
  ON public.wishlist_comments FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update own comments"
  ON public.wishlist_comments FOR UPDATE
  USING (
    commenter_email = auth.jwt()->>'email'
    OR auth.uid() IN (SELECT user_id FROM wishlists WHERE id = wishlist_id)
  );

CREATE POLICY IF NOT EXISTS "Wishlist owner and author can delete comments"
  ON public.wishlist_comments FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM wishlists WHERE id = wishlist_id)
    OR commenter_email = auth.jwt()->>'email'
  );

-- ============================================================================
-- 2. CASH FUNDS (Flexible Contributions)
-- ============================================================================

-- Create cash_funds table
CREATE TABLE IF NOT EXISTS public.cash_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid REFERENCES public.wishlists(id) ON DELETE CASCADE NOT NULL,
  fund_name text NOT NULL,
  fund_description text,
  target_amount numeric(10, 2),
  current_amount numeric(10, 2) DEFAULT 0,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create cash_contributions table
CREATE TABLE IF NOT EXISTS public.cash_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid REFERENCES public.cash_funds(id) ON DELETE CASCADE NOT NULL,
  contributor_name text NOT NULL,
  contributor_email text,
  amount numeric(10, 2) NOT NULL,
  message text,
  is_anonymous boolean DEFAULT false,
  payment_reference text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cash_funds_wishlist ON public.cash_funds(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_cash_funds_active ON public.cash_funds(is_active);
CREATE INDEX IF NOT EXISTS idx_cash_contributions_fund ON public.cash_contributions(fund_id);
CREATE INDEX IF NOT EXISTS idx_cash_contributions_status ON public.cash_contributions(payment_status);

-- Enable RLS
ALTER TABLE public.cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_funds
CREATE POLICY IF NOT EXISTS "Cash funds are viewable by everyone"
  ON public.cash_funds FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Wishlist owner can manage cash funds"
  ON public.cash_funds FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM wishlists WHERE id = wishlist_id));

-- RLS Policies for cash_contributions
CREATE POLICY IF NOT EXISTS "Contributions are viewable by everyone"
  ON public.cash_contributions FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Anyone can create contributions"
  ON public.cash_contributions FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Fund owner can manage contributions"
  ON public.cash_contributions FOR ALL
  USING (
    auth.uid() IN (
      SELECT w.user_id 
      FROM wishlists w
      JOIN cash_funds cf ON cf.wishlist_id = w.id
      WHERE cf.id = fund_id
    )
  );

-- ============================================================================
-- 3. GROUP GIFTING (Partial Claims)
-- ============================================================================

-- Add columns to claims table for group gifting
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS contribution_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS is_group_gift boolean DEFAULT false;

-- Create view for group gift progress
CREATE OR REPLACE VIEW public.group_gift_progress AS
SELECT 
  wi.id as item_id,
  wi.name as item_name,
  wi.price_max as target_amount,
  COALESCE(SUM(c.contribution_amount), 0) as raised_amount,
  COUNT(c.id) FILTER (WHERE c.payment_status = 'completed') as contributor_count,
  CASE 
    WHEN wi.price_max IS NULL THEN 0
    WHEN wi.price_max = 0 THEN 0
    ELSE (COALESCE(SUM(c.contribution_amount), 0) / wi.price_max * 100)
  END as progress_percentage,
  CASE 
    WHEN COALESCE(SUM(c.contribution_amount), 0) >= wi.price_max THEN true
    ELSE false
  END as is_fully_funded
FROM wishlist_items wi
LEFT JOIN claims c ON c.item_id = wi.id 
  AND c.payment_status = 'completed'
  AND c.is_group_gift = true
WHERE wi.price_max IS NOT NULL AND wi.price_max > 0
GROUP BY wi.id, wi.name, wi.price_max;

-- Grant access to view
GRANT SELECT ON public.group_gift_progress TO anon, authenticated;

-- ============================================================================
-- 4. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for comments
DROP TRIGGER IF EXISTS on_comment_updated ON public.wishlist_comments;
CREATE TRIGGER on_comment_updated
  BEFORE UPDATE ON public.wishlist_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for cash funds
DROP TRIGGER IF EXISTS on_cash_fund_updated ON public.cash_funds;
CREATE TRIGGER on_cash_fund_updated
  BEFORE UPDATE ON public.cash_funds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for cash contributions
DROP TRIGGER IF EXISTS on_cash_contribution_updated ON public.cash_contributions;
CREATE TRIGGER on_cash_contribution_updated
  BEFORE UPDATE ON public.cash_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update fund amount when contribution is completed
CREATE OR REPLACE FUNCTION public.update_fund_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE public.cash_funds
    SET current_amount = current_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.fund_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contribution_completed ON public.cash_contributions;
CREATE TRIGGER on_contribution_completed
  AFTER INSERT OR UPDATE ON public.cash_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fund_amount();

-- Credit wallet when contribution is completed
CREATE OR REPLACE FUNCTION public.handle_contribution_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wishlist_owner_id uuid;
  wishlist_currency text;
  owner_wallet_id uuid;
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    SELECT w.user_id, w.currency
    INTO wishlist_owner_id, wishlist_currency
    FROM wishlists w
    JOIN cash_funds cf ON cf.wishlist_id = w.id
    WHERE cf.id = NEW.fund_id;
    
    IF wishlist_owner_id IS NOT NULL THEN
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, COALESCE(wishlist_currency, 'USD'))
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;
      
      UPDATE public.user_wallets
      SET currency = COALESCE(wishlist_currency, 'USD')
      WHERE id = owner_wallet_id 
        AND currency != COALESCE(wishlist_currency, 'USD');
      
      UPDATE public.user_wallets
      SET balance = balance + NEW.amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description
      ) VALUES (
        owner_wallet_id, NEW.amount, 'credit', 'completed', 
        NEW.payment_reference,
        'Cash contribution from ' || NEW.contributor_name
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_contribution_payment_completed ON public.cash_contributions;
CREATE TRIGGER on_contribution_payment_completed
  AFTER INSERT OR UPDATE ON public.cash_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_contribution_completion();

-- Update payment completion handler for group gifts
CREATE OR REPLACE FUNCTION public.handle_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_price numeric;
  wishlist_owner_id uuid;
  wishlist_currency text;
  owner_wallet_id uuid;
  contribution_amount numeric;
BEGIN
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    SELECT wi.price_max, w.user_id, w.currency
    INTO item_price, wishlist_owner_id, wishlist_currency
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;
    
    IF NEW.is_group_gift = true THEN
      contribution_amount := NEW.contribution_amount;
    ELSE
      contribution_amount := item_price;
    END IF;
    
    IF contribution_amount IS NOT NULL AND contribution_amount > 0 THEN
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, COALESCE(wishlist_currency, 'USD'))
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;
      
      UPDATE public.user_wallets
      SET currency = COALESCE(wishlist_currency, 'USD')
      WHERE id = owner_wallet_id 
        AND currency != COALESCE(wishlist_currency, 'USD');
      
      UPDATE public.user_wallets
      SET balance = balance + contribution_amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description, claim_id
      ) VALUES (
        owner_wallet_id, contribution_amount, 'credit', 'completed', 
        NEW.payment_reference, 
        CASE 
          WHEN NEW.is_group_gift THEN 'Group gift contribution for ' || (SELECT name FROM wishlist_items WHERE id = NEW.item_id)
          ELSE 'Payment for ' || (SELECT name FROM wishlist_items WHERE id = NEW.item_id)
        END,
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_completed ON public.claims;
CREATE TRIGGER on_payment_completed
  AFTER INSERT OR UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_completion();

-- Add comments
COMMENT ON COLUMN public.claims.contribution_amount IS 'Amount contributed for group gifts (NULL for full claims)';
COMMENT ON COLUMN public.claims.is_group_gift IS 'True if this is a partial contribution to a group gift';

-- ============================================================================
-- DONE! All migrations applied successfully
-- ============================================================================

SELECT 'All migrations completed successfully!' as status;

