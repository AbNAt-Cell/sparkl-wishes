-- Add is_featured column to wishlists for featured wishlists feature
ALTER TABLE public.wishlists 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add is_premium column to profiles for subscription feature
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Create index for faster featured wishlist queries
CREATE INDEX IF NOT EXISTS idx_wishlists_is_featured ON public.wishlists(is_featured) WHERE is_featured = true;

-- Update RLS policy to allow anyone to view featured wishlists
CREATE POLICY "Anyone can view featured wishlists"
ON public.wishlists
FOR SELECT
USING (is_featured = true);

-- Allow admins to update any wishlist (for featuring)
CREATE POLICY "Admins can update any wishlist"
ON public.wishlists
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));