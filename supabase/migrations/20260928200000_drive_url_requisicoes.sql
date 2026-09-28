-- Link do arquivo no Google Drive, preenchido pelo fluxo do n8n depois do
-- upload do PDF da requisição aprovada
ALTER TABLE public.requisicoes
  ADD COLUMN IF NOT EXISTS drive_url TEXT;
