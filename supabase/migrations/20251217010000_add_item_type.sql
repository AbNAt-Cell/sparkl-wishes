-- Add item_type column to wishlist_items to distinguish physical vs cash items
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'physical' CHECK (item_type IN ('physical','cash'));

-- Ensure external_link remains for product links; no data migration required.
