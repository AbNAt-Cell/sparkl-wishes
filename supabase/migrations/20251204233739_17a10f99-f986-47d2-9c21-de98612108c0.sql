-- Allow guests to claim items by making user_id nullable
ALTER TABLE public.claims 
ALTER COLUMN user_id DROP NOT NULL;