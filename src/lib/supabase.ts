import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Note: For email confirmations to work properly in production,
// update your Supabase project's Site URL in Settings → General
// from http://localhost:3000 to https://your-app.vercel.app

let browserClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
}

/** Browser / RLS key — prefers modern publishable, falls back to legacy anon. */
export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
  }
  return key;
}

/** Server / bypass-RLS key — prefers modern secret, falls back to legacy service_role. */
export function getSupabaseSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)'
    );
  }
  return key;
}

export const createSupabaseServer = () => {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const createSupabaseClient = () => {
  const supabaseUrl = getSupabaseUrl();

  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, getSupabaseSecretKey());
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, getSupabasePublishableKey(), {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        storage: window.localStorage,
      },
    });
  }

  return browserClient;
};

export const supabaseServer = () => createSupabaseServer();

export const supabase = () => createSupabaseClient();

export const createSupabaseAdminClient = () => {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey());
};

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};
