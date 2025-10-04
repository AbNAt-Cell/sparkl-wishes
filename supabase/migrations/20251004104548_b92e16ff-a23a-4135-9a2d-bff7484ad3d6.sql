-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('wedding', 'birthday', 'anniversary', 'baby_shower', 'graduation', 'other')),
  event_date DATE,
  description TEXT,
  cover_image TEXT,
  is_public BOOLEAN DEFAULT true,
  share_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wishlist_items table
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  image_url TEXT,
  external_link TEXT,
  category TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create claims table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.wishlist_items(id) ON DELETE CASCADE,
  claimer_name TEXT,
  claimer_email TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Wishlists policies
CREATE POLICY "Users can view public wishlists"
  ON public.wishlists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own wishlists"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishlists"
  ON public.wishlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlists"
  ON public.wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- Wishlist items policies
CREATE POLICY "Anyone can view items from public wishlists"
  ON public.wishlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE id = wishlist_items.wishlist_id
      AND (is_public = true OR user_id = auth.uid())
    )
  );

CREATE POLICY "Wishlist owners can insert items"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE id = wishlist_items.wishlist_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Wishlist owners can update items"
  ON public.wishlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE id = wishlist_items.wishlist_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Wishlist owners can delete items"
  ON public.wishlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists
      WHERE id = wishlist_items.wishlist_id
      AND user_id = auth.uid()
    )
  );

-- Claims policies
CREATE POLICY "Anyone can view claims for public wishlists"
  ON public.claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlist_items wi
      JOIN public.wishlists w ON wi.wishlist_id = w.id
      WHERE wi.id = claims.item_id
      AND (w.is_public = true OR w.user_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can create claims"
  ON public.claims FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Claim creators can update own claims"
  ON public.claims FOR UPDATE
  USING (claimer_email = auth.jwt()->>'email' OR 
         EXISTS (
           SELECT 1 FROM public.wishlist_items wi
           JOIN public.wishlists w ON wi.wishlist_id = w.id
           WHERE wi.id = claims.item_id AND w.user_id = auth.uid()
         ));

CREATE POLICY "Claim creators can delete own claims"
  ON public.claims FOR DELETE
  USING (claimer_email = auth.jwt()->>'email' OR 
         EXISTS (
           SELECT 1 FROM public.wishlist_items wi
           JOIN public.wishlists w ON wi.wishlist_id = w.id
           WHERE wi.id = claims.item_id AND w.user_id = auth.uid()
         ));

-- Create trigger for profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();