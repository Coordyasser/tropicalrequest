-- Resetar a numeração das requisições para iniciar novamente em 151073
-- ATENÇÃO: isto irá apagar todas as requisições (e itens/rastreios) com ID >= 151073.
-- Use apenas se tiver certeza de que esses registros são apenas de teste.

BEGIN;

  -- Apaga itens de requisição associados às requisições de teste
  DELETE FROM public.itens_requisicao
  WHERE requisicao_id >= 151073;

  -- Apaga registros de rastreio associados às requisições de teste
  DELETE FROM public.rastreio
  WHERE requisicao_id >= 151073;

  -- Apaga as próprias requisições de teste
  DELETE FROM public.requisicoes
  WHERE id >= 151073;

  -- Redefine a sequência para voltar a gerar IDs a partir de 151073
  ALTER SEQUENCE public.seq_ids_id_seq RESTART WITH 151073;

COMMIT;


