import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting simples em memória (por instância)
interface AttemptRecord {
  count: number;
  firstAttempt: number;
}
const attempts = new Map<string, AttemptRecord>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) return false;

  // Reset da janela se passou o tempo
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
  }
}

function clearAttempts(ip: string): void {
  attempts.delete(ip);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'PIN não fornecido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Comparação timing-safe para evitar timing attacks
    const encoder = new TextEncoder();
    const a = encoder.encode(pin.padEnd(appPin.length, '\0'));
    const b = encoder.encode(appPin.padEnd(pin.length, '\0'));
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      diff |= a[i] ^ b[i];
    }
    const isValid = diff === 0;

    if (isValid) {
      clearAttempts(ip);
    } else {
      recordAttempt(ip);
    }

    return new Response(
      JSON.stringify({ valid: isValid }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao validar PIN:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Erro interno' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
