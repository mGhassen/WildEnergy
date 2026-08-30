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
 * Replay registrations for every subscription on a plan (single DB round-trip).
 */
export async function reconcilePlanSubscriptionSessions(
  supabase: SupabaseClient,
  planId: number | string,
  fixRegistrations = true
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await supabase.rpc('reconcile_plan_subscription_sessions', {
    p_plan_id: Number(planId),
    p_fix_registrations: fixRegistrations,
  });

  if (!error) {
    return { data, error: null };
  }

  const message = error.message || String(error);
  if (!message.includes('reconcile_plan_subscription_sessions')) {
    return { data, error };
  }

  // Fallback until migration 20260830180311 is applied on this environment
  const { data: subscriptions, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('plan_id', planId);

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  for (const sub of subscriptions || []) {
    const { error: subError } = await reconcileSubscriptionSessions(
      supabase,
      sub.id,
      fixRegistrations
    );
    if (subError) {
      return { data: null, error: subError };
    }
  }

  return {
    data: {
      success: true,
      plan_id: Number(planId),
      subscriptions_processed: subscriptions?.length ?? 0,
      fallback: true,
    },
    error: null,
  };
}

/**
 * Ensure every subscription on a plan has group/pool session rows for current
 * plan_groups and plan_session_pools.
 *
 * When pools were edited, pass reconcile: true to rebuild balances from registrations.
 */
export async function ensureGroupSessionsForPlanSubscriptions(
  supabase: SupabaseClient,
  planId: number | string,
  options?: { reconcile?: boolean }
): Promise<{ error: unknown; failedSubscriptionId?: number }> {
  if (options?.reconcile) {
    const { data, error } = await reconcilePlanSubscriptionSessions(supabase, planId, true);
    if (error) {
      return { error };
    }
    const result = data as { success?: boolean; failures?: unknown } | null;
    if (result && result.success === false) {
      return {
        error: new Error(
          `Session reconcile failed for plan ${planId}: ${JSON.stringify(result.failures ?? result)}`
        ),
      };
    }
    return { error: null };
  }

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
      return { error, failedSubscriptionId: sub.id };
    }
  }

  return { error: null };
}
