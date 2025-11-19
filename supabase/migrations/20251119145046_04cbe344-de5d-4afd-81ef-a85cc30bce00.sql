-- Permite usuários atualizarem itens de suas próprias requisições
CREATE POLICY "Usuários podem atualizar itens de suas requisições"
ON public.itens_requisicao
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM requisicoes
    WHERE requisicoes.id = itens_requisicao.requisicao_id
    AND requisicoes.user_id = auth.uid()
  )
);

-- Permite usuários deletarem itens de suas próprias requisições
CREATE POLICY "Usuários podem deletar itens de suas requisições"
ON public.itens_requisicao
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM requisicoes
    WHERE requisicoes.id = itens_requisicao.requisicao_id
    AND requisicoes.user_id = auth.uid()
  )
);