-- Create item_views table to track item views
CREATE TABLE IF NOT EXISTS public.item_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  viewer_session_id text, -- To track unique viewers (anonymous cookie-based)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_item_views_item_id ON public.item_views(item_id);
CREATE INDEX IF NOT EXISTS idx_item_views_created_at ON public.item_views(created_at);

-- Enable RLS
ALTER TABLE public.item_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for tracking)
CREATE POLICY IF NOT EXISTS "Anyone can track item views"
  ON public.item_views FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can read item views
CREATE POLICY IF NOT EXISTS "Admins can read item views"
  ON public.item_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth.uid() = profiles.id AND profiles.is_admin = true
    )
  );

-- Create site_visits table to track overall site visits
CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_session_id text, -- To track unique visitors
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON public.site_visits(visitor_session_id);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for tracking)
CREATE POLICY IF NOT EXISTS "Anyone can track site visits"
  ON public.site_visits FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can read site visits
CREATE POLICY IF NOT EXISTS "Admins can read site visits"
  ON public.site_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth.uid() = profiles.id AND profiles.is_admin = true
    )
  );
