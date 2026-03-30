import { supabaseServer } from '@/lib/supabase';

/** profiles.id for this account (accounts.profile_id, or legacy account id). */
export async function resolveProfileIdForAccount(accountId: string) {
  const { data, error } = await supabaseServer()
    .from('accounts')
    .select('profile_id')
    .eq('id', accountId)
    .single();
  if (error || !data) return null;
  return (data.profile_id as string | null) ?? accountId;
}
