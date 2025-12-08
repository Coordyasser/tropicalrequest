-- Tabela para armazenar opções de campos de formulário
CREATE TABLE public.opcoes_formulario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('local_origem', 'destino', 'produto', 'unidade')),
  valor TEXT NOT NULL,
  finalidade TEXT, -- Apenas usado quando tipo = 'produto'
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tipo, valor)
);

-- Enable RLS
ALTER TABLE public.opcoes_formulario ENABLE ROW LEVEL SECURITY;

-- Políticas: todos usuários autenticados podem ler
CREATE POLICY "Usuários autenticados podem ver opções"
ON public.opcoes_formulario
FOR SELECT
TO authenticated
USING (true);

-- Políticas: todos usuários autenticados podem inserir
CREATE POLICY "Usuários autenticados podem criar opções"
ON public.opcoes_formulario
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Políticas: todos usuários autenticados podem atualizar
CREATE POLICY "Usuários autenticados podem atualizar opções"
ON public.opcoes_formulario
FOR UPDATE
TO authenticated
USING (true);

-- Políticas: todos usuários autenticados podem deletar
CREATE POLICY "Usuários autenticados podem deletar opções"
ON public.opcoes_formulario
FOR DELETE
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_opcoes_formulario_updated_at
BEFORE UPDATE ON public.opcoes_formulario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais
INSERT INTO public.opcoes_formulario (tipo, valor) VALUES
  ('local_origem', 'Vila Diamantina'),
  ('local_origem', 'Deck Condominio'),
  ('local_origem', 'Galpoes'),
  ('local_origem', 'Outros'),
  ('destino', 'Setor de Compras'),
  ('unidade', 'Und'),
  ('unidade', 'Peça'),
  ('unidade', 'Caixa'),
  ('unidade', 'Saco'),
  ('unidade', 'Pacote'),
  ('unidade', 'Rolo'),
  ('unidade', 'm³'),
  ('unidade', 'm²'),
  ('unidade', 'Metro'),
  ('unidade', 'Barra'),
  ('unidade', 'Litro'),
  ('unidade', 'Galão'),
  ('unidade', 'Balde'),
  ('unidade', 'Lata'),
  ('unidade', 'Kg'),
  ('unidade', 'Carrada'),
  ('unidade', 'Serviço'),
  ('unidade', 'Pares');