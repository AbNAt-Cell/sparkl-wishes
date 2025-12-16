-- Fix cash contribution trigger to deduct platform fees
-- This ensures platform fees are deducted from cash contributions just like regular claims

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
  admin_wallet_id uuid;
  settings jsonb;
  fee_percent numeric := 0.0;
  fee_min numeric := 0.0;
  fee_max numeric := 9999999.0;
  fee_amount numeric := 0.0;
  net_amount numeric := 0.0;
BEGIN
  -- Only proceed if payment status changed to completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Get wishlist owner and currency
    SELECT w.user_id, w.currency
    INTO wishlist_owner_id, wishlist_currency
    FROM wishlists w
    JOIN cash_funds cf ON cf.wishlist_id = w.id
    WHERE cf.id = NEW.fund_id;
    
    IF wishlist_owner_id IS NOT NULL AND NEW.amount IS NOT NULL AND NEW.amount > 0 THEN
      -- Load platform fee settings
      SELECT value INTO settings FROM app_settings WHERE key = 'payments';
      IF settings IS NOT NULL THEN
        fee_percent := COALESCE((settings->>'platformFeePercent')::numeric, 0.0);
        fee_min := COALESCE((settings->>'platformFeeMin')::numeric, 0.0);
        fee_max := COALESCE((settings->>'platformFeeMax')::numeric, 9999999.0);
      END IF;
      
      -- Calculate fee with clamp
      fee_amount := NEW.amount * fee_percent;
      IF fee_amount < fee_min THEN 
        fee_amount := fee_min; 
      END IF;
      IF fee_amount > fee_max THEN 
        fee_amount := fee_max; 
      END IF;
      
      -- Net amount is contribution minus fees
      net_amount := GREATEST(NEW.amount - fee_amount, 0);
      
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
      
      -- Credit the owner's wallet with net amount (after fees)
      UPDATE public.user_wallets
      SET balance = balance + net_amount,
          updated_at = now()
      WHERE id = owner_wallet_id;
      
      -- Record transaction with fee breakdown
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description
      ) VALUES (
        owner_wallet_id, net_amount, 'credit', 'completed', 
        NEW.payment_reference,
        'Cash contribution (' || NEW.amount::text || ' paid, ' || fee_amount::text || ' fee, ' || net_amount::text || ' net)'
      );
      
      -- Credit platform fee to admin wallet (if fee > 0)
      IF fee_amount > 0 THEN
        -- Ensure admin wallet exists
        INSERT INTO public.user_wallets (user_id, balance, currency)
        VALUES ('00000000-0000-0000-0000-000000000000', 0, 'USD')
        ON CONFLICT (user_id) DO NOTHING;

        -- Get admin wallet ID
        SELECT id INTO admin_wallet_id
        FROM public.user_wallets
        WHERE user_id = '00000000-0000-0000-0000-000000000000';

        -- Credit admin wallet with the fee amount
        UPDATE public.user_wallets
        SET balance = balance + fee_amount,
            updated_at = now()
        WHERE id = admin_wallet_id;

        -- Record platform fee transaction
        INSERT INTO public.wallet_transactions (
          wallet_id, amount, type, status, reference, description
        ) VALUES (
          admin_wallet_id, fee_amount, 'credit', 'completed', NEW.payment_reference,
          'Platform fee for cash contribution'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_contribution_completion() IS 
'Handles payment completion for cash fund contributions. Credits wallet with net amount after platform fees. Platform fees are routed to admin wallet.';
