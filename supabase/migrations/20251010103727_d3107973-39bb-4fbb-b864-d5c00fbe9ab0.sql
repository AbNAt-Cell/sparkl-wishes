-- Create storage bucket for wishlist item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('wishlist-items', 'wishlist-items', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for wishlist item images
CREATE POLICY "Anyone can view wishlist item images"
ON storage.objects FOR SELECT
USING (bucket_id = 'wishlist-items');

CREATE POLICY "Authenticated users can upload wishlist item images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wishlist-items' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own wishlist item images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'wishlist-items'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own wishlist item images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'wishlist-items'
  AND auth.uid()::text = (storage.foldername(name))[1]
);