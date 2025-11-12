-- Create public bucket for company images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imagem', 'imagem', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public access to images
CREATE POLICY "Public Access to Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagem');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imagem' AND auth.role() = 'authenticated');