import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { ensureGroupSessionsForPlanSubscriptions } from '@/lib/subscription-group-sessions';
import {
  PLAN_WITH_GROUPS_AND_POOLS_SELECT,
  applyPlanSessionPoolMemberships,
  replacePlanSessionPools,
  syncPlanSessionPoolRows,
  validatePlanAllocations,
} from '@/lib/plan-session-pools';

export async function GET(req: NextRequest) {
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
    const { data: plans, error } = await supabaseServer()
      .from('plans')
      .select(PLAN_WITH_GROUPS_AND_POOLS_SELECT)
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const { planGroups, planSessionPools, ...planData } = await req.json();

    const validationError = validatePlanAllocations(planGroups, planSessionPools);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { data: plan, error: planError } = await supabaseServer()
      .from('plans')
      .insert(planData)
      .select('*')
      .single();

    if (planError) {
      return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }

    if (planGroups && planGroups.length > 0) {
      const planGroupsData = planGroups.map((group: any) => ({
        plan_id: plan.id,
        group_id: group.groupId,
        session_count: group.sessionCount,
        is_free: group.isFree || false,
      }));

      const { error: groupsError } = await supabaseServer()
        .from('plan_groups')
        .insert(planGroupsData);

      if (groupsError) {
        await supabaseServer().from('plans').delete().eq('id', plan.id);
        return NextResponse.json({ error: 'Failed to create plan groups' }, { status: 500 });
      }
    }

    const { error: poolsError } = await replacePlanSessionPools(
      supabaseServer(),
      plan.id,
      planSessionPools ?? []
    );
    if (poolsError) {
      await supabaseServer().from('plans').delete().eq('id', plan.id);
      return NextResponse.json({
        error: poolsError instanceof Error ? poolsError.message : 'Failed to create session pools',
      }, { status: 500 });
    }

    const { data: completePlan, error: fetchError } = await supabaseServer()
      .from('plans')
      .select(PLAN_WITH_GROUPS_AND_POOLS_SELECT)
      .eq('id', plan.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch complete plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan: completePlan });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    const { id, planGroups, planSessionPools, ...updates } = await req.json();

    if (planGroups !== undefined || planSessionPools !== undefined) {
      const validationError = validatePlanAllocations(
        planGroups,
        planSessionPools
      );
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
    let needsReconcile = false;

    const rewritingGroups = planGroups !== undefined;
    const rewritingPools = planSessionPools !== undefined;

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
      needsReconcile =
        poolSync.membershipChanged ||
        poolSync.deletedPoolIds.length > 0 ||
        poolSync.createdPoolIds.length > 0;
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
      const { error: syncError } = await ensureGroupSessionsForPlanSubscriptions(
        supabaseServer(),
        id,
        { reconcile: needsReconcile }
      );
      if (syncError) {
        console.error('Error syncing subscription sessions after plan update:', syncError);
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
