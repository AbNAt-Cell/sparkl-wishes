-- Grant execution permissions on the RPC function to anon and authenticated roles
GRANT EXECUTE ON FUNCTION create_wishlist_claim(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  BOOLEAN,
  NUMERIC
) TO anon, authenticated;
