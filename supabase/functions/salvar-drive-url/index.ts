import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Chamada pelo fluxo do n8n depois do upload do PDF no Google Drive.
// Não há usuário logado nessa chamada: a autenticação é o header
// x-webhook-secret, comparado com o secret N8N_WEBHOOK_SECRET.

const jsonHeaders = { 'Content-Type': 'application/json' };

function responder(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

// Comparação timing-safe, igual à do validate-pin
function segredoConfere(recebido: string, esperado: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(recebido.padEnd(esperado.length, '\0'));
  const b = encoder.encode(esperado.padEnd(recebido.length, '\0'));
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return responder(405, { error: 'Método não permitido' });
  }

  const segredo = Deno.env.get('N8N_WEBHOOK_SECRET');
  if (!segredo) {
    console.error('N8N_WEBHOOK_SECRET não configurado no ambiente');
    return responder(500, { error: 'Segredo não configurado no sistema' });
  }

  if (!segredoConfere(req.headers.get('x-webhook-secret') ?? '', segredo)) {
    return responder(401, { error: 'Não autorizado' });
  }

  try {
    const { id, drive_url } = await req.json();

    const requisicaoId = Number(id);
    if (!Number.isInteger(requisicaoId) || requisicaoId <= 0) {
      return responder(400, { error: 'id inválido' });
    }
    if (typeof drive_url !== 'string' || !drive_url.startsWith('https://drive.google.com/')) {
      return responder(400, { error: 'drive_url inválido' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('requisicoes')
      .update({ drive_url })
      .eq('id', requisicaoId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return responder(404, { error: `Requisição ${requisicaoId} não encontrada` });
    }

    return responder(200, { ok: true, id: requisicaoId });
  } catch (error) {
    console.error('Erro ao salvar link do Drive:', error);
    return responder(500, { error: 'Erro interno' });
  }
});
