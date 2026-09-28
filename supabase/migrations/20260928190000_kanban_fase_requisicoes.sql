-- Fase da requisição no quadro Kanban (substitui o quadro do Trello)
ALTER TABLE public.requisicoes
  ADD COLUMN IF NOT EXISTS fase TEXT,
  ADD COLUMN IF NOT EXISTS fase_atualizada_em TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Requisições que já existiam eram geridas no Trello: entram como arquivadas
-- para o quadro começar limpo.
UPDATE public.requisicoes SET fase = 'arquivadas' WHERE fase IS NULL;

-- Toda requisição nova começa na primeira coluna
ALTER TABLE public.requisicoes
  ALTER COLUMN fase SET DEFAULT 'novas',
  ALTER COLUMN fase SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requisicoes_fase_check') THEN
    ALTER TABLE public.requisicoes
      ADD CONSTRAINT requisicoes_fase_check
      CHECK (fase IN ('novas', 'aguardando_liberacao', 'em_cotacao', 'finalizadas', 'arquivadas'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_requisicoes_fase ON public.requisicoes(fase);

-- Tempo real: o quadro Kanban escuta mudanças em requisicoes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requisicoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requisicoes;
  END IF;
END $$;
