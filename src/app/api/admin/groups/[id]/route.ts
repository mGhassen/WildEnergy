import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;

    // Fetch group with its categories through many-to-many relationship
    const { data: group, error } = await supabaseServer()
      .from('groups')
      .select(`
        *,
        category_groups(
          category:categories (
            id,
            name,
            description,
            color
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
    }

    // Process the response to match expected format
    const processedGroup = {
      ...group,
      categories: group.category_groups?.map((cg: any) => cg.category) || []
    };

    return NextResponse.json(processedGroup);
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
    const { categoryIds, ...updates } = await req.json();
    
    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    
    // Update the group
    const { data: group, error: groupError } = await supabaseServer()
      .from('groups')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (groupError) {
      return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
    }

    // Update group-category relationships if provided
    if (categoryIds !== undefined) {
      // Remove all existing category-group relationships for this group
      const { error: removeError } = await supabaseServer()
        .from('category_groups')
        .delete()
        .eq('group_id', id);

      if (removeError) {
        return NextResponse.json({ error: 'Failed to remove existing categories from group' }, { status: 500 });
      }

      // Create new category-group relationships
      if (categoryIds.length > 0) {
        const categoryGroupRelations = categoryIds.map((categoryId: number) => ({
          category_id: categoryId,
          group_id: parseInt(id)
        }));

        const { error: categoriesError } = await supabaseServer()
          .from('category_groups')
          .insert(categoryGroupRelations);

        if (categoriesError) {
          return NextResponse.json({ error: 'Failed to assign categories to group' }, { status: 500 });
        }
      }
    }

    // Fetch the complete group with categories through many-to-many relationship
    const { data: completeGroup, error: fetchError } = await supabaseServer()
      .from('groups')
      .select(`
        *,
        category_groups(
          category:categories (
            id,
            name,
            description,
            color
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch complete group' }, { status: 500 });
    }

    // Process the response to match expected format
    const processedGroup = {
      ...completeGroup,
      categories: completeGroup.category_groups?.map((cg: any) => cg.category) || []
    };

    return NextResponse.json({ success: true, group: processedGroup });
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

    // Check if group is used in any plans
    const { data: linkedPlans, error: plansError } = await supabaseServer()
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

    // Remove category-group relationships for this group
    const { error: categoriesError } = await supabaseServer()
      .from('category_groups')
      .delete()
      .eq('group_id', id);

    if (categoriesError) {
      return NextResponse.json({ error: 'Failed to unlink categories from group' }, { status: 500 });
    }

    // Delete the group
    const { error } = await supabaseServer()
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
