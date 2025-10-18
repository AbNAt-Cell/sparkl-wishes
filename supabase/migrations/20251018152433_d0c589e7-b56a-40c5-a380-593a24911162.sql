-- Create wallet table for user balances
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on wallet table
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet"
ON public.user_wallets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own wallet
CREATE POLICY "Users can update own wallet"
ON public.user_wallets
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can insert their own wallet
CREATE POLICY "Users can insert own wallet"
ON public.user_wallets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create wallet transactions table for tracking
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'withdrawal')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reference text,
  description text,
  claim_id uuid REFERENCES public.claims(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on wallet transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions
FOR SELECT
USING (wallet_id IN (SELECT id FROM public.user_wallets WHERE user_id = auth.uid()));

-- Add claim expiration timestamp
ALTER TABLE public.claims
ADD COLUMN expires_at timestamp with time zone,
ADD COLUMN claimer_phone text;

-- Set expiration for existing pending claims (10 minutes from creation)
UPDATE public.claims
SET expires_at = created_at + interval '10 minutes'
WHERE payment_status = 'pending' AND expires_at IS NULL;

-- Create function to handle payment completion
CREATE OR REPLACE FUNCTION public.handle_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_price numeric;
  wishlist_owner_id uuid;
  owner_wallet_id uuid;
BEGIN
  -- Only proceed if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get item price and wishlist owner
    SELECT wi.price_max, w.user_id
    INTO item_price, wishlist_owner_id
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;
    
    IF item_price IS NOT NULL AND item_price > 0 THEN
      -- Get or create wallet for wishlist owner
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, 'USD')
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;
      
      -- Credit the owner's wallet
      UPDATE public.user_wallets
      SET balance = balance + item_price,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      -- Record transaction
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description, claim_id
      ) VALUES (
        owner_wallet_id, item_price, 'credit', 'completed', 
        NEW.payment_reference, 'Payment for ' || (SELECT name FROM wishlist_items WHERE id = NEW.item_id),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for payment completion
CREATE TRIGGER on_payment_completed
AFTER INSERT OR UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_completion();

-- Create function to expire unpaid claims
CREATE OR REPLACE FUNCTION public.expire_unpaid_claims()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete claims that are pending and expired
  DELETE FROM public.claims
  WHERE payment_status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

-- Add trigger to update wallet updated_at
CREATE TRIGGER update_wallet_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();