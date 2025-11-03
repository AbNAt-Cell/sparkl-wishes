-- Add allow_group_gifting column to wishlist_items
-- This allows item creators to choose if multiple people can contribute

ALTER TABLE public.wishlist_items
ADD COLUMN IF NOT EXISTS allow_group_gifting BOOLEAN DEFAULT false NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.wishlist_items.allow_group_gifting IS 
  'If true, multiple people can contribute to this item (group gifting). If false, only one person can claim it.';

-- Update existing items to disallow group gifting by default
UPDATE public.wishlist_items
SET allow_group_gifting = false
WHERE allow_group_gifting IS NULL;

-- Add contribution_amount column to claims table
-- This stores how much each person contributed (for group gifting)
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS contribution_amount DECIMAL(10, 2) NULL;

-- Add is_group_gift column to claims table
-- Marks whether this claim is part of a group gift
ALTER TABLE public.claims
ADD COLUMN IF NOT EXISTS is_group_gift BOOLEAN DEFAULT false NOT NULL;

-- Add comments
COMMENT ON COLUMN public.claims.contribution_amount IS 
  'Amount contributed by this claimer. For group gifts, this is their partial contribution. For single claims, this equals the item price.';

COMMENT ON COLUMN public.claims.is_group_gift IS 
  'True if this claim is part of a group gift (multiple people contributing to one item).';

-- Drop the unique constraint on claims.item_id if it exists
-- This allows multiple people to contribute to group-gifted items
ALTER TABLE public.claims
DROP CONSTRAINT IF EXISTS claims_item_id_key;

COMMENT ON TABLE public.claims IS 
  'Stores gift claims. Multiple claims per item are allowed for group gifting. Single-claim items are enforced at the application level.';

