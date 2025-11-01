-- Add support for partial claims (group gifting)
-- Modify claims table to support partial amounts

ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS contribution_amount numeric(10, 2),
ADD COLUMN IF NOT EXISTS is_group_gift boolean DEFAULT false;

-- Create a view to see group gift progress
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

-- Grant access to the view
GRANT SELECT ON public.group_gift_progress TO anon, authenticated;

-- Update the payment completion trigger to handle partial claims
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
  -- Only proceed if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get item price, wishlist owner, AND CURRENCY
    SELECT wi.price_max, w.user_id, w.currency
    INTO item_price, wishlist_owner_id, wishlist_currency
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;
    
    -- Determine the contribution amount
    -- For group gifts, use the contribution_amount field
    -- For regular claims, use the full item price
    IF NEW.is_group_gift = true THEN
      contribution_amount := NEW.contribution_amount;
    ELSE
      contribution_amount := item_price;
    END IF;
    
    IF contribution_amount IS NOT NULL AND contribution_amount > 0 THEN
      -- Get or create wallet for wishlist owner WITH CORRECT CURRENCY
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, COALESCE(wishlist_currency, 'USD'))
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Get the wallet ID
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;
      
      -- If wallet exists but has wrong currency, update it
      UPDATE public.user_wallets
      SET currency = COALESCE(wishlist_currency, 'USD')
      WHERE id = owner_wallet_id 
        AND currency != COALESCE(wishlist_currency, 'USD');
      
      -- Credit the owner's wallet
      UPDATE public.user_wallets
      SET balance = balance + contribution_amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      -- Record transaction
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

-- Add comment to explain the fields
COMMENT ON COLUMN public.claims.contribution_amount IS 'Amount contributed for group gifts (NULL for full claims)';
COMMENT ON COLUMN public.claims.is_group_gift IS 'True if this is a partial contribution to a group gift';

