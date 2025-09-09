import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;

    // Fetch group with its categories
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }

    return NextResponse.json(group);
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

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const { categoryIds, ...updates } = await req.json();
    
    // Update the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (groupError) {
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    // Update group-category relationships if provided
    if (categoryIds !== undefined) {
      // Remove all categories from this group first
      const { error: removeError } = await supabase
        .from('categories')
        .update({ group_id: null })
        .eq('group_id', id);

      if (removeError) {
        return NextResponse.json({ error: 'Failed to remove existing categories from group' }, { status: 500 });
      }

      // Assign new categories to this group
      if (categoryIds.length > 0) {
        const { error: categoriesError } = await supabase
          .from('categories')
          .update({ group_id: id })
          .in('id', categoryIds);

        if (categoriesError) {
          return NextResponse.json({ error: 'Failed to assign categories to group' }, { status: 500 });
        }
      }
    }

    // Fetch the complete group with categories
    const { data: completeGroup, error: fetchError } = await supabase
      .from('groups')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch complete group' }, { status: 500 });
    }

    return NextResponse.json({ success: true, group: completeGroup });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Check if group is used in any plans
    const { data: linkedPlans, error: plansError } = await supabase
      .from('plan_groups')
      .select(`
        id,
        plans (
          id,
          name
        )
      `)
      .eq('group_id', id);

    if (plansError) {
      return NextResponse.json({ error: 'Failed to check linked plans' }, { status: 500 });
    }

    // If group is used in plans, block deletion and return linked plans
    if (linkedPlans && linkedPlans.length > 0) {
      const planNames = linkedPlans.map((pg: any) => pg.plans?.name).filter(Boolean);
      return NextResponse.json({ 
        error: 'Cannot delete group', 
        message: 'This group is used in the following plans. Please remove it from these plans first.',
        linkedPlans: planNames,
        canDelete: false
      }, { status: 400 });
    }

    // Remove categories from this group (unlink, don't delete)
    const { error: categoriesError } = await supabase
      .from('categories')
      .update({ group_id: null })
      .eq('group_id', id);

    if (categoriesError) {
      return NextResponse.json({ error: 'Failed to unlink categories from group' }, { status: 500 });
    }

    // Delete the group
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
    }

    return NextResponse.json({ success: true, canDelete: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
