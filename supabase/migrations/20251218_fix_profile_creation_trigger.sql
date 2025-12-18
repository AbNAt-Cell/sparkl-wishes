-- Fix the profile creation trigger to handle null values properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    CASE 
      WHEN new.raw_user_meta_data->>'avatar_url' = '' THEN NULL
      ELSE new.raw_user_meta_data->>'avatar_url'
    END,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = CASE 
      WHEN new.raw_user_meta_data->>'avatar_url' = '' THEN NULL
      ELSE new.raw_user_meta_data->>'avatar_url'
    END,
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', new.email, profiles.full_name),
    updated_at = now()
  WHERE profiles.id = new.id;
  
  RETURN new;
END;
$$;
