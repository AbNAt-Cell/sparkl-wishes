-- Add claimer_identifier to claims and update RPC to populate it for guest claims
ALTER TABLE IF EXISTS public.claims
  ADD COLUMN IF NOT EXISTS claimer_identifier TEXT;

-- Update function to populate claimer_identifier for guest claims
CREATE OR REPLACE FUNCTION create_wishlist_claim(
  p_item_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_claimer_name TEXT,
  p_claimer_email TEXT,
  p_claimer_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT false,
  p_is_group_gift BOOLEAN DEFAULT false,
  p_contribution_amount NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_claim RECORD;
  item_price NUMERIC;
  payment_status TEXT := 'not_required';
  expires_at TIMESTAMPTZ := NULL;
  v_claimer_identifier TEXT := NULL;
BEGIN
  -- Get item details
  SELECT price_max INTO item_price
  FROM wishlist_items
  WHERE id = p_item_id;

  -- Set payment status and expiry
  IF item_price IS NOT NULL AND item_price > 0 THEN
    payment_status := 'pending';
    expires_at := now() + interval '20 minutes';
  END IF;

  -- Set claimer identifier for guests (use email)
  IF p_user_id IS NULL AND p_claimer_email IS NOT NULL THEN
    v_claimer_identifier := lower(trim(p_claimer_email));
  END IF;

  -- Insert the claim
  INSERT INTO claims (
    item_id,
    user_id,
    claimer_name,
    claimer_email,
    claimer_phone,
    notes,
    is_anonymous,
    payment_status,
    expires_at,
    is_group_gift,
    contribution_amount,
    claimer_identifier
  )
  VALUES (
    p_item_id,
    p_user_id,
    p_claimer_name,
    p_claimer_email,
    p_claimer_phone,
    p_notes,
    p_is_anonymous,
    payment_status,
    expires_at,
    p_is_group_gift,
    p_contribution_amount,
    v_claimer_identifier
  )
  RETURNING * INTO result_claim;

  RETURN json_build_object(
    'success', true,
    'claim', row_to_json(result_claim)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;