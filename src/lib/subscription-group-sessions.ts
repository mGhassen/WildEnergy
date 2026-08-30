import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensure subscription_group_sessions and subscription_pool_sessions rows exist
 * for the subscription's current plan. Missing rows only — never overwrites
 * existing remaining balances.
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
 * Replay registrations chronologically to rebuild pool/group balances and
 * retag class_registrations with the correct session_source / pool_id / group_id.
 */
export async function reconcileSubscriptionSessions(
  supabase: SupabaseClient,
  subscriptionId: number,
  fixRegistrations = true
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await supabase.rpc('reconcile_subscription_sessions', {
    p_subscription_id: subscriptionId,
    p_fix_registrations: fixRegistrations,
  });
  return { data, error };
}

/**
 * When the plan changes, drop old group/pool session rows then recreate from
 * the new plan by replaying registrations (pool ids change on plan pool rewrite).
 */
export async function resetSubscriptionGroupSessionsForPlan(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<{ error: unknown }> {
  const { error: deleteGroupError } = await supabase
    .from('subscription_group_sessions')
    .delete()
    .eq('subscription_id', subscriptionId);

  if (deleteGroupError) {
    return { error: deleteGroupError };
  }

  const { error: deletePoolError } = await supabase
    .from('subscription_pool_sessions')
    .delete()
    .eq('subscription_id', subscriptionId);

  if (deletePoolError) {
    return { error: deletePoolError };
  }

  const { error } = await reconcileSubscriptionSessions(supabase, subscriptionId, true);
  return { error };
}

/**
 * Ensure every subscription on a plan has group/pool session rows for current
 * plan_groups and plan_session_pools.
 *
 * When pools were rewritten (new plan_session_pools ids), pass reconcile: true
 * so usage is rebuilt from class_registrations instead of resetting to full.
 */
export async function ensureGroupSessionsForPlanSubscriptions(
  supabase: SupabaseClient,
  planId: number | string,
  options?: { reconcile?: boolean }
): Promise<{ error: unknown }> {
  const { data: subscriptions, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('plan_id', planId);

  if (fetchError) {
    return { error: fetchError };
  }

  for (const sub of subscriptions || []) {
    if (options?.reconcile) {
      const { error } = await reconcileSubscriptionSessions(supabase, sub.id, true);
      if (error) {
        console.error(
          `Failed to reconcile sessions for subscription ${sub.id}:`,
          error
        );
      }
      continue;
    }

    const { error } = await ensureSubscriptionGroupSessions(supabase, sub.id);
    if (error) {
      console.error(`Failed to ensure group sessions for subscription ${sub.id}:`, error);
    }
  }

  return { error: null };
}
