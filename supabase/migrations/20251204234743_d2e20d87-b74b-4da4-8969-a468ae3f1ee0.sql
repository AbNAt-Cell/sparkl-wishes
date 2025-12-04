-- Allow anyone to update payment fields on pending claims they have the ID for
-- This enables the client to record the payment reference after Paystack callback
CREATE POLICY "Anyone can update payment fields on pending claims"
ON public.claims
FOR UPDATE
USING (payment_status = 'pending')
WITH CHECK (payment_status IN ('pending', 'completed'));