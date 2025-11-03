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

      -- Credit net amount
      update public.user_wallets
      set balance = balance + net_amount,
          updated_at = now()
      where id = owner_wallet_id;

      -- Record transaction with description and fee note
      insert into public.wallet_transactions (
        wallet_id, amount, type, status, reference, description, claim_id
      ) values (
        owner_wallet_id, net_amount, 'credit', 'completed', NEW.payment_reference,
        'Payment for ' || (select name from wishlist_items where id = NEW.item_id) || ' (net of fees)',
        NEW.id
      );
    end if;
  end if;

  return NEW;
end;
$$;


