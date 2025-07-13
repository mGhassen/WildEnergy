import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client (for API routes)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);

// Client-side Supabase client (for browser)
let supabase: ReturnType<typeof createClient> | null = null;

if (typeof window !== 'undefined') {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};