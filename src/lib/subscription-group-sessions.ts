import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensure subscription_group_sessions rows exist for the subscription's current plan.
 * Missing rows only — never overwrites existing remaining balances.
 */
export async function ensureSubscriptionGroupSessions(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<{ error: unknown }> {
  const { error } = await supabase.rpc('ensure_subscription_group_sessions', {
    p_subscription_id: subscriptionId,
  });
  return { error };
}

/**
 * When the plan changes, drop old group-session rows then recreate from the new plan
 * (accounting for registrations already charged to this subscription).
 */
export async function resetSubscriptionGroupSessionsForPlan(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<{ error: unknown }> {
  const { error: deleteError } = await supabase
    .from('subscription_group_sessions')
    .delete()
    .eq('subscription_id', subscriptionId);

  if (deleteError) {
    return { error: deleteError };
  }

  return ensureSubscriptionGroupSessions(supabase, subscriptionId);
}

/**
 * Ensure every subscription on a plan has group-session rows for current plan_groups.
 */
export async function ensureGroupSessionsForPlanSubscriptions(
  supabase: SupabaseClient,
  planId: number | string
): Promise<{ error: unknown }> {
  const { data: subscriptions, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('plan_id', planId);

  if (fetchError) {
    return { error: fetchError };
  }

  for (const sub of subscriptions || []) {
    const { error } = await ensureSubscriptionGroupSessions(supabase, sub.id);
    if (error) {
      console.error(`Failed to ensure group sessions for subscription ${sub.id}:`, error);
    }
  }

  return { error: null };
}
