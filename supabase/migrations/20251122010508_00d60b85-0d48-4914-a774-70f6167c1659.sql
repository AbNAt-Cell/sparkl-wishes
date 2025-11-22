-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  bank_name text,
  account_number text,
  account_name text,
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Admins can update withdrawal requests
CREATE POLICY "Admins can update withdrawal requests"
ON public.withdrawal_requests FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Create trigger to update withdrawal_requests updated_at
CREATE OR REPLACE FUNCTION public.handle_withdrawal_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_withdrawal_updated_at();

-- Update the claim payment trigger to credit wallet
CREATE OR REPLACE FUNCTION public.handle_claim_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wishlist_owner_id uuid;
  wishlist_currency text;
  owner_wallet_id uuid;
  item_name text;
BEGIN
  -- Only process when payment status changes to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get wishlist owner and currency
    SELECT w.user_id, w.currency, wi.name
    INTO wishlist_owner_id, wishlist_currency, item_name
    FROM wishlists w
    JOIN wishlist_items wi ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;
    
    IF wishlist_owner_id IS NOT NULL AND NEW.contribution_amount IS NOT NULL THEN
      -- Create wallet if it doesn't exist
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, COALESCE(wishlist_currency, 'USD'))
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Get wallet ID
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;
      
      -- Update wallet balance
      UPDATE public.user_wallets
      SET balance = balance + NEW.contribution_amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      -- Create transaction record
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description, claim_id
      ) VALUES (
        owner_wallet_id, 
        NEW.contribution_amount, 
        'credit', 
        'completed',
        NEW.payment_reference,
        'Payment for ' || item_name || ' from ' || COALESCE(NEW.claimer_name, 'Anonymous'),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on claims table
DROP TRIGGER IF EXISTS on_claim_payment_completed ON public.claims;
CREATE TRIGGER on_claim_payment_completed
  AFTER INSERT OR UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_claim_payment();