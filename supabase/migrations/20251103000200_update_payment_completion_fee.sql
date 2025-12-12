-- Create admin wallet for platform fees
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@sparkl-wishes.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"role": "admin"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, is_admin, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Platform Admin',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_wallets (user_id, balance, currency, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  0,
  'USD',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- Update payment completion trigger to credit net of platform fee
create or replace function public.handle_payment_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_price numeric;
  wishlist_owner_id uuid;
  owner_wallet_id uuid;
  settings jsonb;
  fee_percent numeric := 0.0;
  fee_min numeric := 0.0;
  fee_max numeric := 9999999.0;
  fee_amount numeric := 0.0;
  net_amount numeric := 0.0;
begin
  if NEW.payment_status = 'completed' and (OLD.payment_status is null or OLD.payment_status <> 'completed') then
    select wi.price_max, w.user_id into item_price, wishlist_owner_id
    from wishlist_items wi
    join wishlists w on wi.wishlist_id = w.id
    where wi.id = NEW.item_id;

    -- Load settings
    select value into settings from app_settings where key = 'payments';
    if settings is not null then
      fee_percent := coalesce((settings->>'platformFeePercent')::numeric, 0.0);
      fee_min := coalesce((settings->>'platformFeeMin')::numeric, 0.0);
      fee_max := coalesce((settings->>'platformFeeMax')::numeric, 9999999.0);
    end if;

    if item_price is not null and item_price > 0 then
      -- Calculate fee with clamp
      fee_amount := item_price * fee_percent;
      if fee_amount < fee_min then fee_amount := fee_min; end if;
      if fee_amount > fee_max then fee_amount := fee_max; end if;
      net_amount := greatest(item_price - fee_amount, 0);

      -- Ensure wallet exists
      insert into public.user_wallets (user_id, balance, currency)
      values (wishlist_owner_id, 0, 'USD')
      on conflict (user_id) do nothing;

      select id into owner_wallet_id from public.user_wallets where user_id = wishlist_owner_id;

      -- Credit net amount to owner
      update public.user_wallets
      set balance = balance + net_amount,
          updated_at = now()
      where id = owner_wallet_id;

      -- Record transaction for owner with description and fee note
      insert into public.wallet_transactions (
        wallet_id, amount, type, status, reference, description, claim_id
      ) values (
        owner_wallet_id, net_amount, 'credit', 'completed', NEW.payment_reference,
        'Payment for ' || (select name from wishlist_items where id = NEW.item_id) || ' (net of ' || fee_percent * 100 || '% platform fee)',
        NEW.id
      );

      -- Credit platform fee to admin wallet (if fee > 0)
      if fee_amount > 0 then
        -- Create admin wallet if it doesn't exist (admin user ID: fixed UUID)
        insert into public.user_wallets (user_id, balance, currency)
        values ('00000000-0000-0000-0000-000000000000', 0, 'USD')
        on conflict (user_id) do nothing;

        -- Get admin wallet ID
        declare admin_wallet_id uuid;
        select id into admin_wallet_id from public.user_wallets where user_id = '00000000-0000-0000-0000-000000000000';

        -- Credit platform fee
        update public.user_wallets
        set balance = balance + fee_amount,
            updated_at = now()
        where id = admin_wallet_id;

        -- Record platform fee transaction
        insert into public.wallet_transactions (
          wallet_id, amount, type, status, reference, description, claim_id
        ) values (
          admin_wallet_id, fee_amount, 'credit', 'completed', NEW.payment_reference,
          'Platform fee for ' || (select name from wishlist_items where id = NEW.item_id),
          NEW.id
        );
      end if;
    end if;
  end if;

  return NEW;
end;
$$;


