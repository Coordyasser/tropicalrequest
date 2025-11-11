-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('requisicoes_pdfs', 'requisicoes_pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can view their own PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'requisicoes_pdfs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "System can upload PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'requisicoes_pdfs');