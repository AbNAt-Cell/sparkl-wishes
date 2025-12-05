-- Fix the credit_wallet_on_claim_paid trigger to use correct column name
CREATE OR REPLACE FUNCTION public.credit_wallet_on_claim_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  wallet_record record;
  wishlist_owner_id uuid;
begin
  if NEW.payment_status = 'completed' 
     and (OLD.payment_status is distinct from 'completed' or OLD.payment_status is null) then

    -- Get the wishlist owner from the item
    SELECT w.user_id INTO wishlist_owner_id
    FROM wishlists w
    JOIN wishlist_items wi ON wi.wishlist_id = w.id
    WHERE wi.id = NEW.item_id;

    IF wishlist_owner_id IS NULL THEN
      RETURN NEW;
    END IF;

    select id into wallet_record
    from user_wallets
    where user_id = wishlist_owner_id
    for update;

    if not found then
      insert into user_wallets (user_id, balance)
      values (wishlist_owner_id, 0)
      returning id into wallet_record;
    end if;

    update user_wallets
    set balance = balance + COALESCE(NEW.contribution_amount, 0),
        updated_at = now()
    where id = wallet_record.id;

    insert into wallet_transactions (
      wallet_id, amount, type, status, description, reference, claim_id
    ) values (
      wallet_record.id,
      COALESCE(NEW.contribution_amount, 0),
      'credit',
      'completed',
      'Claim payment via Paystack',
      NEW.payment_reference,
      NEW.id
    );
  end if;
  return NEW;
end;
$function$;