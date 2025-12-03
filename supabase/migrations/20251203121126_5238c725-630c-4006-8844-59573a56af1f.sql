-- Permitir que usuários deletem suas próprias requisições
CREATE POLICY "Usuários podem deletar suas próprias requisições"
ON public.requisicoes
FOR DELETE
USING (auth.uid() = user_id);

-- Permitir que usuários deletem itens de requisições que serão deletadas (já existe, mas garantindo)
-- Os itens serão deletados em cascata ou manualmente antes da requisição