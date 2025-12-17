-- Add claim_type column to track personal delivery vs cash equivalent for physical gifts
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS claim_type TEXT DEFAULT 'cash_equivalent' CHECK (claim_type IN ('personal_delivery', 'cash_equivalent'));

-- Add comment for clarity
COMMENT ON COLUMN public.claims.claim_type IS 'For physical gifts: personal_delivery means guest pays token fee, cash_equivalent means guest contributes to price';
