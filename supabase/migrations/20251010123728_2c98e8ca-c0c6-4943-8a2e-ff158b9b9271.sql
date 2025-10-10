-- Add currency field to wishlists table
ALTER TABLE wishlists ADD COLUMN currency text NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN wishlists.currency IS 'Currency code for all items in this wishlist (e.g., USD, NGN, GBP)';