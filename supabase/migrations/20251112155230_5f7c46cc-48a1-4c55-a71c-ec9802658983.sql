-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;

-- Create more permissive policy for uploading images
-- Allow service role (edge functions) to upload
CREATE POLICY "Allow service role to upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imagem');

-- Allow service role to update images
CREATE POLICY "Allow service role to update images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'imagem');