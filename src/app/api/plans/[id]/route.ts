import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user (member or admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = context.params;

    // Fetch plan with its groups
    const { data: plan, error } = await supabase
      .from('plans')
      .select(`
        *,
        plan_groups (
          id,
          group_id,
          session_count,
          groups (
            id,
            name,
            description,
            color,
            categories (
              id,
              name,
              description,
              color
            )
          )
        )
      `)
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

export async function PUT(req: NextRequest, context: { params: any }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = context.params;
    const { planGroups, ...updates } = await req.json();
    
    // Update the plan
    const { data: plan, error: planError } = await supabase
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
      const { error: deleteError } = await supabase
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
        }));

        const { error: groupsError } = await supabase
          .from('plan_groups')
          .insert(planGroupsData);

        if (groupsError) {
          return NextResponse.json({ error: 'Failed to update plan groups' }, { status: 500 });
        }
      }
    }

    // Fetch the complete plan with groups
    const { data: completePlan, error: fetchError } = await supabase
      .from('plans')
      .select(`
        *,
        plan_groups (
          id,
          group_id,
          session_count,
          groups (
            id,
            name,
            description,
            color,
            categories (
              id,
              name,
              description,
              color
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

export async function DELETE(req: NextRequest, context: { params: any }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = context.params;

    // Delete plan groups first (due to foreign key constraint)
    const { error: groupsError } = await supabase
      .from('plan_groups')
      .delete()
      .eq('plan_id', id);

    if (groupsError) {
      return NextResponse.json({ error: 'Failed to delete plan groups' }, { status: 500 });
    }

    // Delete the plan
    const { error } = await supabase
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