import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    // Verify user (member or admin)
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    // Fetch all plans with their groups
    const { data: plans, error } = await supabaseServer()
      .from('plans')
      .select(`
        *,
        plan_groups (
          id,
          group_id,
          session_count,
          is_free,
          groups (
            id,
            name,
            description,
            color,
            category_groups (
              categories (
                id,
                name,
                description,
                color
              )
            )
          )
        )
      `)
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
    // Verify admin
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
    const { planGroups, ...planData } = await req.json();
    
    // No need to calculate max_sessions as it's now handled by plan_groups
    
    // Create the plan first
    const { data: plan, error: planError } = await supabaseServer()
      .from('plans')
      .insert(planData)
      .select('*')
      .single();
    
    if (planError) {
      return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }

    // Create plan groups if provided
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
        // Rollback plan creation
        await supabaseServer().from('plans').delete().eq('id', plan.id);
        return NextResponse.json({ error: 'Failed to create plan groups' }, { status: 500 });
      }
    }

    // Fetch the complete plan with groups
    const { data: completePlan, error: fetchError } = await supabaseServer()
      .from('plans')
      .select(`
        *,
        plan_groups (
          id,
          group_id,
          session_count,
          is_free,
          groups (
            id,
            name,
            description,
            color,
            category_groups (
              categories (
                id,
                name,
                description,
                color
              )
            )
          )
        )
      `)
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
    // Verify admin
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
    const { id, planGroups, ...updates } = await req.json();
    
    // No need to calculate max_sessions as it's now handled by plan_groups
    
    // Update the plan
    const { data: plan, error: planError } = await supabaseServer()
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (planError) {
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
    }

    // Update plan groups if provided
    if (planGroups !== undefined) {
      // Delete existing plan groups
      const { error: deleteError } = await supabaseServer()
        .from('plan_groups')
        .delete()
        .eq('plan_id', id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to delete existing plan groups' }, { status: 500 });
      }

      // Insert new plan groups
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
    }

    // Fetch the complete plan with groups
    const { data: completePlan, error: fetchError } = await supabaseServer()
      .from('plans')
      .select(`
        *,
        plan_groups (
          id,
          group_id,
          session_count,
          is_free,
          groups (
            id,
            name,
            description,
            color,
            category_groups (
              categories (
                id,
                name,
                description,
                color
              )
            )
          )
        )
      `)
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