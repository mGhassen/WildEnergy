import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment variables",
  );
}

// Create a Supabase client with service role key for admin operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Export the Supabase client as db for consistency with existing code
export const db = {
  // You can add any database utility methods here
  // For example, you might want to add methods that wrap common Supabase operations
  // with your application's specific error handling and logging
  async query(sql: string, params?: any[]) {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: sql,
      params: params || []
    });
    
    if (error) throw error;
    return data;
  },
  
  // Add other database utility methods as needed
  ...supabase
};