-- Add thank you messages to claims
-- Allows wishlist owners to send thank you notes to gift givers

ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS thank_you_message text,
ADD COLUMN IF NOT EXISTS thank_you_sent_at timestamptz;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_claims_thank_you ON public.claims(thank_you_sent_at) WHERE thank_you_sent_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.claims.thank_you_message IS 'Personal thank you message from wishlist owner to gift giver';
COMMENT ON COLUMN public.claims.thank_you_sent_at IS 'Timestamp when thank you message was sent';

