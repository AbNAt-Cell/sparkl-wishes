-- Fix RLS policy to explicitly allow anonymous and authenticated users to insert claims
DROP POLICY IF EXISTS "Anyone can create claims" ON public.claims;

CREATE POLICY "Anyone can create claims"
  ON public.claims FOR INSERT
  TO public, anon, authenticated
  WITH CHECK (true);

-- Grant execute on the RPC function to both anon and authenticated roles
-- The RPC function may not exist yet in some environments (migration order).
-- Only attempt the GRANT if the function exists to avoid migration failures.
DO $$
BEGIN
  DECLARE
    func_oid oid;
    identity_args text;
  BEGIN
    SELECT p.oid INTO func_oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_wishlist_claim'
      AND n.nspname = 'public'
    LIMIT 1;

    IF func_oid IS NOT NULL THEN
      SELECT pg_get_function_identity_arguments(func_oid) INTO identity_args;
      IF identity_args IS NULL THEN
        RAISE NOTICE 'Could not determine function identity arguments; attempting generic GRANT.';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_wishlist_claim TO anon, authenticated, public;';
      ELSE
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.create_wishlist_claim(%s) TO anon, authenticated, public;', identity_args);
      END IF;
    ELSE
      RAISE NOTICE 'create_wishlist_claim function not found; skipping GRANT EXECUTE.';
    END IF;
  END;
END
$$ LANGUAGE plpgsql;
