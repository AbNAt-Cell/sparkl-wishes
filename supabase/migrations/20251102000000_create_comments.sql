-- Create wishlist_comments table for guest book and item comments
CREATE TABLE IF NOT EXISTS public.wishlist_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id uuid REFERENCES public.wishlists(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  commenter_name text NOT NULL,
  commenter_email text,
  comment_text text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_wishlist ON public.wishlist_comments(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_comments_item ON public.wishlist_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.wishlist_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.wishlist_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
-- Everyone can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON public.wishlist_comments
  FOR SELECT
  USING (true);

-- Anyone can insert comments (guests can comment)
CREATE POLICY "Anyone can create comments"
  ON public.wishlist_comments
  FOR INSERT
  WITH CHECK (true);

-- Only comment author can update their own comments (by matching email)
CREATE POLICY "Users can update own comments"
  ON public.wishlist_comments
  FOR UPDATE
  USING (
    commenter_email = auth.jwt()->>'email'
    OR auth.uid() IN (
      SELECT user_id FROM wishlists WHERE id = wishlist_id
    )
  );

-- Wishlist owner and comment author can delete
CREATE POLICY "Wishlist owner and author can delete comments"
  ON public.wishlist_comments
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM wishlists WHERE id = wishlist_id
    )
    OR commenter_email = auth.jwt()->>'email'
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_updated
  BEFORE UPDATE ON public.wishlist_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

