-- Ensure the claims INSERT policy exists and allows anyone to create claims
DROP POLICY IF EXISTS "Anyone can create claims" ON public.claims;

CREATE POLICY "Anyone can create claims"
ON public.claims FOR INSERT
WITH CHECK (true);
