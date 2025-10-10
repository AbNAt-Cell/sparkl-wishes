-- Clear all data from tables (in correct order to respect dependencies)
DELETE FROM claims;
DELETE FROM wishlist_items;
DELETE FROM wishlists;
DELETE FROM profiles;