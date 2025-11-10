-- Tabela de sequência para IDs personalizados
CREATE TABLE IF NOT EXISTS public.seq_ids (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela principal de requisições
CREATE TABLE IF NOT EXISTS public.requisicoes (
  id BIGINT PRIMARY KEY DEFAULT nextval('seq_ids_id_seq'::regclass),
  solicitante TEXT NOT NULL,
  local_origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'gerada')),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Tabela de itens da requisição
CREATE TABLE IF NOT EXISTS public.itens_requisicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id BIGINT REFERENCES public.requisicoes(id) ON DELETE CASCADE NOT NULL,
  produto TEXT NOT NULL,
  unidade TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de rastreio
CREATE TABLE IF NOT EXISTS public.rastreio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id BIGINT REFERENCES public.requisicoes(id) ON DELETE CASCADE NOT NULL,
  data_aprovacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  aprovado_por TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_requisicoes_user_id ON public.requisicoes(user_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_status ON public.requisicoes(status);
CREATE INDEX IF NOT EXISTS idx_itens_requisicao_id ON public.itens_requisicao(requisicao_id);
CREATE INDEX IF NOT EXISTS idx_rastreio_requisicao_id ON public.rastreio(requisicao_id);

-- Habilitar RLS
ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_requisicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rastreio ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para requisicoes
CREATE POLICY "Usuários podem ver suas próprias requisições"
  ON public.requisicoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias requisições"
  ON public.requisicoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias requisições"
  ON public.requisicoes FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas RLS para itens_requisicao
CREATE POLICY "Usuários podem ver itens de suas requisições"
  ON public.itens_requisicao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requisicoes 
      WHERE requisicoes.id = itens_requisicao.requisicao_id 
      AND requisicoes.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar itens para suas requisições"
  ON public.itens_requisicao FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requisicoes 
      WHERE requisicoes.id = itens_requisicao.requisicao_id 
      AND requisicoes.user_id = auth.uid()
    )
  );

-- Políticas RLS para rastreio
CREATE POLICY "Usuários podem ver rastreio de suas requisições"
  ON public.rastreio FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.requisicoes 
      WHERE requisicoes.id = rastreio.requisicao_id 
      AND requisicoes.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar rastreio para suas requisições"
  ON public.rastreio FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requisicoes 
      WHERE requisicoes.id = rastreio.requisicao_id 
      AND requisicoes.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_requisicoes_updated_at
  BEFORE UPDATE ON public.requisicoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();