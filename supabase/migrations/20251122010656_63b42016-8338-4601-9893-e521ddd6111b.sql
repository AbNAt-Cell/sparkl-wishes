-- Fix security warning by setting search_path on handle_withdrawal_updated_at
CREATE OR REPLACE FUNCTION public.handle_withdrawal_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;