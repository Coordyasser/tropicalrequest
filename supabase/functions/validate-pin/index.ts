import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin } = await req.json();
    
    if (!pin || typeof pin !== 'string') {
      console.log('PIN inválido recebido:', pin);
      return new Response(
        JSON.stringify({ valid: false, error: 'PIN não fornecido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const appPin = Deno.env.get('APP_PIN');
    
    if (!appPin) {
      console.error('APP_PIN não configurado no ambiente');
      return new Response(
        JSON.stringify({ valid: false, error: 'PIN não configurado no sistema' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const isValid = pin === appPin;
    console.log('Validação de PIN:', isValid ? 'sucesso' : 'falhou');

    return new Response(
      JSON.stringify({ valid: isValid }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Erro ao validar PIN:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro interno' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
