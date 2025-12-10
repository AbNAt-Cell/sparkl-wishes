-- Drop the overly permissive policy that exposes sensitive data
DROP POLICY IF EXISTS "Anyone can view claims for public wishlists" ON public.claims;

-- Create a more restrictive policy: only wishlist owners and claim creators can view claims
CREATE POLICY "Wishlist owners and claim creators can view claims" 
ON public.claims 
FOR SELECT 
USING (
  -- Claim creator can view their own claim (by email match)
  (claimer_email = (auth.jwt() ->> 'email'::text))
  OR
  -- Wishlist owner can view claims on their items
  (EXISTS (
    SELECT 1
    FROM wishlist_items wi
    JOIN wishlists w ON wi.wishlist_id = w.id
    WHERE wi.id = claims.item_id AND w.user_id = auth.uid()
  ))
);