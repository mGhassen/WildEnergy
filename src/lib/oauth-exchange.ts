import { createSupabaseClient } from '@/lib/supabase';

const exchangedCodes = new Set<string>();
let inFlightExchange: Promise<{ ok: boolean; error?: string }> | null = null;
let inFlightCode: string | null = null;

export async function exchangeOAuthCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSupabaseClient();

  const { data: existingSession } = await supabase.auth.getSession();
  if (existingSession.session) {
    return { ok: true };
  }

  if (exchangedCodes.has(code)) {
    const { data: retrySession } = await supabase.auth.getSession();
    if (retrySession.session) {
      return { ok: true };
    }
    return { ok: false, error: 'Authorization code already used' };
  }

  if (inFlightExchange && inFlightCode === code) {
    return inFlightExchange;
  }

  inFlightCode = code;
  inFlightExchange = (async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      inFlightExchange = null;
      inFlightCode = null;
      return { ok: false, error: error.message };
    }

    exchangedCodes.add(code);
    inFlightExchange = null;
    inFlightCode = null;
    return { ok: true };
  })();

  return inFlightExchange;
}
