import { supabaseServer } from '@/lib/supabase';

/**
 * Mark active/pending subscriptions past their inclusive end_date as expired.
 * Uses Africa/Tunis calendar day (same as expire_past_subscriptions SQL).
 * Returns the update count, or null if the RPC failed.
 */
export async function expirePastSubscriptions(): Promise<number | null> {
  const { data, error } = await supabaseServer().rpc('expire_past_subscriptions');

  if (error) {
    console.error('[EXPIRE] expire_past_subscriptions failed:', error);
    return null;
  }

  return typeof data === 'number' ? data : 0;
}
