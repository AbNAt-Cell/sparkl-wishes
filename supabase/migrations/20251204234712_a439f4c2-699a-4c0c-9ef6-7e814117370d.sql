-- Create trigger to auto-complete claims when payment_reference is set
CREATE OR REPLACE FUNCTION public.auto_complete_claim_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If payment_reference is being set and payment wasn't already completed
  IF NEW.payment_reference IS NOT NULL 
     AND NEW.payment_reference != '' 
     AND (OLD.payment_reference IS NULL OR OLD.payment_reference = '')
     AND NEW.payment_status != 'completed' THEN
    NEW.payment_status := 'completed';
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_complete_claim_payment ON public.claims;

CREATE TRIGGER trigger_auto_complete_claim_payment
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.auto_complete_claim_payment();