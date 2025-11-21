-- Add admin policy to allow viewing all claims
CREATE POLICY "Admins can view all claims"
ON public.claims
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);