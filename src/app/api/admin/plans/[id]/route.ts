import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ensureGroupSessionsForPlanSubscriptions } from '@/lib/subscription-group-sessions';
import {
  PLAN_WITH_GROUPS_AND_POOLS_SELECT,
  applyPlanSessionPoolMemberships,
  syncPlanSessionPoolRows,
  validatePlanAllocations,
} from '@/lib/plan-session-pools';
import { isFreePlan } from '@/lib/subscription-status';

function normalizePlanPricing(planData: Record<string, any>) {
  const free = isFreePlan({
    is_free: planData.is_free,
    price: planData.price,
  });
  if (free) {
    planData.is_free = true;
    planData.price = 0;
  } else if (planData.is_free !== undefined) {
    planData.is_free = false;
  }
  return planData;
}
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: plan, error } = await supabaseServer()
      .from('plans')
      .select(PLAN_WITH_GROUPS_AND_POOLS_SELECT)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const { planGroups, planSessionPools, ...rawUpdates } = await req.json();
    const updates = normalizePlanPricing(rawUpdates);

    if (planGroups !== undefined || planSessionPools !== undefined) {
      const validationError = validatePlanAllocations(planGroups, planSessionPools);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const { data: plan, error: planError } = await supabaseServer()
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (planError) {
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
    }

    let shouldSyncSessions = false;

    const rewritingGroups = planGroups !== undefined;
    const rewritingPools = planSessionPools !== undefined;

    const needsReconcile = rewritingPools;

    let poolSync: Awaited<ReturnType<typeof syncPlanSessionPoolRows>> | null = null;

    if (rewritingPools) {
      poolSync = await syncPlanSessionPoolRows(
        supabaseServer(),
        Number(id),
        planSessionPools
      );
      if (poolSync.error) {
        const message =
          poolSync.error instanceof Error
            ? poolSync.error.message
            : 'Failed to update session pools';
        return NextResponse.json({ error: message }, { status: 500 });
      }
      shouldSyncSessions = true;
    }

    if (rewritingGroups) {
      const { error: deleteError } = await supabaseServer()
        .from('plan_groups')
        .delete()
        .eq('plan_id', id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to delete existing plan groups' }, { status: 500 });
      }

      if (planGroups.length > 0) {
        const planGroupsData = planGroups.map((group: any) => ({
          plan_id: id,
          group_id: group.groupId,
          session_count: group.sessionCount,
          is_free: group.isFree || false,
        }));

        const { error: groupsError } = await supabaseServer()
          .from('plan_groups')
          .insert(planGroupsData);

        if (groupsError) {
          return NextResponse.json({ error: 'Failed to update plan groups' }, { status: 500 });
        }
      }
      shouldSyncSessions = true;
    }

    if (rewritingPools && poolSync) {
      const { error: membershipError } = await applyPlanSessionPoolMemberships(
        supabaseServer(),
        Number(id),
        planSessionPools,
        poolSync.poolIds
      );
      if (membershipError) {
        return NextResponse.json({ error: 'Failed to update session pool groups' }, { status: 500 });
      }
    }

    if (shouldSyncSessions) {
      const { error: syncError, failedSubscriptionId } =
        await ensureGroupSessionsForPlanSubscriptions(supabaseServer(), id, {
          reconcile: needsReconcile,
        });
      if (syncError) {
        console.error('Error syncing subscription sessions after plan update:', syncError);
        return NextResponse.json(
          {
            error: needsReconcile
              ? `Plan pools updated but session balances failed to rebuild${failedSubscriptionId ? ` (subscription ${failedSubscriptionId})` : ''}. Run reconcile_subscription_sessions in SQL.`
              : 'Failed to sync subscription sessions after plan update',
          },
          { status: 500 }
        );
      }
    }

    const { data: completePlan, error: fetchError } = await supabaseServer()
      .from('plans')
      .select(PLAN_WITH_GROUPS_AND_POOLS_SELECT)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch complete plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: completePlan });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    const { data: subscriptions, error: subscriptionError } = await supabaseServer()
      .from('subscriptions')
      .select('id, member_id, status')
      .eq('plan_id', id);

    if (subscriptionError) {
      return NextResponse.json({ error: 'Failed to check plan subscriptions' }, { status: 500 });
    }

    if (subscriptions && subscriptions.length > 0) {
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
      if (activeSubscriptions.length > 0) {
        return NextResponse.json({
          error: 'Cannot delete plan with active subscriptions',
          message: `This plan is used by ${activeSubscriptions.length} active subscription(s). Please cancel or transfer these subscriptions first.`,
          linkedSubscriptions: activeSubscriptions
        }, { status: 400 });
      }
    }

    // Pools cascade via FK; also delete dedicated groups explicitly for clarity
    await supabaseServer().from('plan_session_pools').delete().eq('plan_id', id);

    const { error: groupsError } = await supabaseServer()
      .from('plan_groups')
      .delete()
      .eq('plan_id', id);

    if (groupsError) {
      return NextResponse.json({ error: 'Failed to delete plan groups' }, { status: 500 });
    }

    const { error } = await supabaseServer()
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
