import { createClient } from '@supabase/supabase-js';

// Use Next.js public environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
};