-- Fix payment completion trigger to properly handle group gifts AND platform fees
-- This migration fixes the broken trigger that was introduced in 20251103000200
-- Issues fixed:
-- 1. Group gifts were not being handled (contribution_amount ignored)
-- 2. Currency was hardcoded to USD
-- 3. Platform fees were not being applied correctly to group gifts

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
  settings jsonb;
  fee_percent numeric := 0.0;
  fee_min numeric := 0.0;
  fee_max numeric := 9999999.0;
  fee_amount numeric := 0.0;
  net_amount numeric := 0.0;
  payment_amount numeric; -- The actual amount paid (before fees)
BEGIN
  -- Only proceed if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get item price, wishlist owner, AND CURRENCY
    SELECT wi.price_max, w.user_id, w.currency
    INTO item_price, wishlist_owner_id, wishlist_currency
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;
    
    -- Determine the actual payment amount
    -- For group gifts, use the contribution_amount field
    -- For regular claims, use the full item price
    IF NEW.is_group_gift = true AND NEW.contribution_amount IS NOT NULL THEN
      payment_amount := NEW.contribution_amount;
    ELSE
      payment_amount := item_price;
    END IF;
    
    IF payment_amount IS NOT NULL AND payment_amount > 0 THEN
      -- Load platform fee settings
      SELECT value INTO settings FROM app_settings WHERE key = 'payments';
      IF settings IS NOT NULL THEN
        fee_percent := COALESCE((settings->>'platformFeePercent')::numeric, 0.0);
        fee_min := COALESCE((settings->>'platformFeeMin')::numeric, 0.0);
        fee_max := COALESCE((settings->>'platformFeeMax')::numeric, 9999999.0);
      END IF;
      
      -- Calculate fee with clamp (fees apply to the actual payment amount)
      fee_amount := payment_amount * fee_percent;
      IF fee_amount < fee_min THEN 
        fee_amount := fee_min; 
      END IF;
      IF fee_amount > fee_max THEN 
        fee_amount := fee_max; 
      END IF;
      
      -- Net amount is payment minus fees
      net_amount := GREATEST(payment_amount - fee_amount, 0);
      
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
      
      -- Credit the owner's wallet with net amount (after fees)
      UPDATE public.user_wallets
      SET balance = balance + net_amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      -- Record transaction with proper description
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description, claim_id
      ) VALUES (
        owner_wallet_id, 
        net_amount, 
        'credit', 
        'completed', 
        NEW.payment_reference,
        CASE 
          WHEN NEW.is_group_gift THEN 
            'Group gift contribution for ' || (SELECT name FROM wishlist_items WHERE id = NEW.item_id) || 
            ' (' || payment_amount::text || ' paid, ' || fee_amount::text || ' fee, ' || net_amount::text || ' net)'
          ELSE 
            'Payment for ' || (SELECT name FROM wishlist_items WHERE id = NEW.item_id) || 
            ' (' || payment_amount::text || ' paid, ' || fee_amount::text || ' fee, ' || net_amount::text || ' net)'
        END,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_payment_completion() IS 
'Handles payment completion for both single and group gifts. Credits wallet with net amount after platform fees. For group gifts, uses contribution_amount; for single gifts, uses item price_max.';

