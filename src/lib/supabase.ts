import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Note: For email confirmations to work properly in production,
// update your Supabase project's Site URL in Settings → General
// from http://localhost:3000 to https://your-app.vercel.app

// Server-side Supabase client (for API routes)
export const createSupabaseServer = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase server environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// Client-side Supabase client (for browser)
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase client environment variables');
  }
  
  if (typeof window === 'undefined') {
    // Server-side - use service role key
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseServiceRoleKey) {
      throw new Error('Missing Supabase service role key for server-side operations');
    }
    return createClient(supabaseUrl, supabaseServiceRoleKey);
  }
  
  // Client-side
  return createClient(supabaseUrl, supabaseAnonKey);
};

// For backward compatibility - create only when needed
let _supabaseServer: SupabaseClient | null = null;
let _supabase: SupabaseClient | null = null;

export const supabaseServer = () => {
  if (!_supabaseServer) {
    _supabaseServer = createSupabaseServer();
  }
  return _supabaseServer;
};

export const supabase = () => {
  if (!_supabase) {
    _supabase = createSupabaseClient();
  }
  return _supabase;
};

export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase admin environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
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