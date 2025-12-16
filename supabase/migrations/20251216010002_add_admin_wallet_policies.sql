-- Add admin access policies to wallet tables
-- Allow admin users to view and manage wallet data for reporting/auditing

-- Policy for admin to view admin wallet
CREATE POLICY "Admins can view admin wallet"
ON public.user_wallets
FOR SELECT
USING (
  user_id = '00000000-0000-0000-0000-000000000000' 
  AND auth.jwt() ->> 'role' = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Policy for admin to view admin wallet transactions
CREATE POLICY "Admins can view admin wallet transactions"
ON public.wallet_transactions
FOR SELECT
USING (
  wallet_id IN (
    SELECT id FROM public.user_wallets 
    WHERE user_id = '00000000-0000-0000-0000-000000000000'
  )
  AND auth.jwt() ->> 'role' = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
