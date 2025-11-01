-- Fix currency consistency in wallet creation
-- The trigger was hardcoded to USD, now it uses the wishlist's currency

DROP TRIGGER IF EXISTS on_payment_completed ON public.claims;
DROP FUNCTION IF EXISTS public.handle_payment_completion();

-- Recreate function with correct currency handling
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
BEGIN
  -- Only proceed if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get item price, wishlist owner, AND CURRENCY
    SELECT wi.price_max, w.user_id, w.currency
    INTO item_price, wishlist_owner_id, wishlist_currency
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;
    
    IF item_price IS NOT NULL AND item_price > 0 THEN
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

-- Recreate trigger
CREATE TRIGGER on_payment_completed
AFTER INSERT OR UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_completion();

-- Fix existing wallets with wrong currency
-- This will update any wallets that don't match their wishlist's currency
UPDATE public.user_wallets
SET currency = (
  SELECT w.currency 
  FROM wishlists w 
  WHERE w.user_id = user_wallets.user_id 
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 
  FROM wishlists w 
  WHERE w.user_id = user_wallets.user_id 
    AND w.currency IS NOT NULL 
    AND w.currency != user_wallets.currency
);

