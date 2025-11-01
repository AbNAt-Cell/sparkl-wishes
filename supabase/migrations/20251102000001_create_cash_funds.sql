-- Create cash_funds table for flexible monetary contributions
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

-- Create cash_contributions table to track individual contributions
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
-- Everyone can view active funds
CREATE POLICY "Cash funds are viewable by everyone"
  ON public.cash_funds
  FOR SELECT
  USING (true);

-- Wishlist owner can manage their funds
CREATE POLICY "Wishlist owner can manage cash funds"
  ON public.cash_funds
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM wishlists WHERE id = wishlist_id
    )
  );

-- RLS Policies for cash_contributions
-- Everyone can view contributions (respecting anonymity in app)
CREATE POLICY "Contributions are viewable by everyone"
  ON public.cash_contributions
  FOR SELECT
  USING (true);

-- Anyone can create contributions (guests can contribute)
CREATE POLICY "Anyone can create contributions"
  ON public.cash_contributions
  FOR INSERT
  WITH CHECK (true);

-- Only fund owner can update/delete contributions
CREATE POLICY "Fund owner can manage contributions"
  ON public.cash_contributions
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT w.user_id 
      FROM wishlists w
      JOIN cash_funds cf ON cf.wishlist_id = w.id
      WHERE cf.id = fund_id
    )
  );

-- Trigger to update fund current_amount when contribution is completed
CREATE OR REPLACE FUNCTION public.update_fund_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    UPDATE public.cash_funds
    SET current_amount = current_amount + NEW.amount,
        updated_at = now()
    WHERE id = NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_contribution_completed
  AFTER INSERT OR UPDATE ON public.cash_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fund_amount();

-- Trigger to credit wishlist owner's wallet when contribution is completed
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
  -- Only proceed if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get wishlist owner and currency
    SELECT w.user_id, w.currency
    INTO wishlist_owner_id, wishlist_currency
    FROM wishlists w
    JOIN cash_funds cf ON cf.wishlist_id = w.id
    WHERE cf.id = NEW.fund_id;
    
    IF wishlist_owner_id IS NOT NULL THEN
      -- Get or create wallet for wishlist owner
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, COALESCE(wishlist_currency, 'USD'))
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Get the wallet ID
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;
      
      -- Update wallet currency if needed
      UPDATE public.user_wallets
      SET currency = COALESCE(wishlist_currency, 'USD')
      WHERE id = owner_wallet_id 
        AND currency != COALESCE(wishlist_currency, 'USD');
      
      -- Credit the owner's wallet
      UPDATE public.user_wallets
      SET balance = balance + NEW.amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      -- Record transaction
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

CREATE TRIGGER on_contribution_payment_completed
  AFTER INSERT OR UPDATE ON public.cash_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_contribution_completion();

-- Add updated_at triggers
CREATE TRIGGER on_cash_fund_updated
  BEFORE UPDATE ON public.cash_funds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_cash_contribution_updated
  BEFORE UPDATE ON public.cash_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

