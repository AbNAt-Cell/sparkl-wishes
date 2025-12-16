-- Retroactively apply platform fees to past cash contributions
-- This migration corrects wallet balances and transactions for contributions processed before fee deduction was implemented

DO $$
DECLARE
  contribution RECORD;
  wishlist_owner_id uuid;
  owner_wallet_id uuid;
  admin_wallet_id uuid;
  settings jsonb;
  fee_percent numeric := 0.0;
  fee_min numeric := 0.0;
  fee_max numeric := 9999999.0;
  fee_amount numeric := 0.0;
  total_fees numeric := 0;
BEGIN
  -- Load platform fee settings
  SELECT value INTO settings FROM app_settings WHERE key = 'payments';
  IF settings IS NOT NULL THEN
    fee_percent := COALESCE((settings->>'platformFeePercent')::numeric, 0.0);
    fee_min := COALESCE((settings->>'platformFeeMin')::numeric, 0.0);
    fee_max := COALESCE((settings->>'platformFeeMax')::numeric, 9999999.0);
  END IF;

  -- Ensure admin wallet exists
  INSERT INTO public.user_wallets (user_id, balance, currency)
  VALUES ('00000000-0000-0000-0000-000000000000', 0, 'USD')
  ON CONFLICT (user_id) DO NOTHING;

  -- Get admin wallet ID
  SELECT id INTO admin_wallet_id
  FROM public.user_wallets
  WHERE user_id = '00000000-0000-0000-0000-000000000000';

  -- Process each completed cash contribution
  FOR contribution IN
    SELECT cc.id, cc.amount, cc.payment_reference, cc.created_at,
           w.user_id as wishlist_owner_id
    FROM cash_contributions cc
    JOIN cash_funds cf ON cc.fund_id = cf.id
    JOIN wishlists w ON cf.wishlist_id = w.id
    WHERE cc.payment_status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM wallet_transactions
        WHERE reference = cc.payment_reference
          AND description LIKE '%Platform fee for cash contribution%'
      )
  LOOP
    wishlist_owner_id := contribution.wishlist_owner_id;
    
    -- Calculate fee for this contribution
    fee_amount := contribution.amount * fee_percent;
    IF fee_amount < fee_min THEN 
      fee_amount := fee_min; 
    END IF;
    IF fee_amount > fee_max THEN 
      fee_amount := fee_max; 
    END IF;

    -- Only process if there's a fee to deduct
    IF fee_amount > 0 THEN
      -- Get or create wallet for wishlist owner
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (wishlist_owner_id, 0, 'USD')
      ON CONFLICT (user_id) DO NOTHING;

      -- Get the wallet ID
      SELECT id INTO owner_wallet_id
      FROM public.user_wallets
      WHERE user_id = wishlist_owner_id;

      -- Deduct fee from owner's wallet
      UPDATE public.user_wallets
      SET balance = balance - fee_amount,
          updated_at = now()
      WHERE id = owner_wallet_id;

      -- Credit admin wallet with the fee
      UPDATE public.user_wallets
      SET balance = balance + fee_amount,
          updated_at = now()
      WHERE id = admin_wallet_id;

      -- Record fee deduction transaction for owner
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description
      ) VALUES (
        owner_wallet_id, fee_amount, 'debit', 'completed',
        contribution.payment_reference || '_fee_correction',
        'Platform fee correction for past cash contribution (' || fee_amount::text || ')'
      );

      -- Record fee credit transaction for admin
      INSERT INTO public.wallet_transactions (
        wallet_id, amount, type, status, reference, description
      ) VALUES (
        admin_wallet_id, fee_amount, 'credit', 'completed',
        contribution.payment_reference || '_fee_correction',
        'Platform fee collected for cash contribution'
      );

      total_fees := total_fees + fee_amount;
    END IF;
  END LOOP;

  RAISE NOTICE 'Retroactively applied platform fees to cash contributions. Total fees collected: %', total_fees;
END $$;

COMMENT ON FUNCTION public.handle_contribution_completion() IS 
'Handles payment completion for cash fund contributions. Credits wallet with net amount after platform fees. Platform fees are routed to admin wallet.';
