import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Note: For email confirmations to work properly in production,
// update your Supabase project's Site URL in Settings → General
// from http://localhost:3000 to https://your-app.vercel.app

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};