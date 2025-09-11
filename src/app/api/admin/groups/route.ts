import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseServer } from '@/lib/supabase';

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

    // Fetch all groups with their categories via junction table
    const { data: groups, error } = await supabaseServer()
      .from('groups')
      .select(`
        *,
        category_groups (
          categories (
            id,
            name,
            description,
            color
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
    }

    // Transform the data to match the expected interface
    const transformedGroups = groups?.map(group => ({
      ...group,
      categories: group.category_groups?.map((cg: any) => cg.categories) || []
    })) || [];

    return NextResponse.json(transformedGroups);
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

    const { categoryIds, ...groupData } = await req.json();
    
    // Convert camelCase to snake_case for database
    const dbData: any = {};
    if (groupData.name !== undefined) dbData.name = groupData.name;
    if (groupData.description !== undefined) dbData.description = groupData.description;
    if (groupData.color !== undefined) dbData.color = groupData.color;
    if (groupData.isActive !== undefined) dbData.is_active = groupData.isActive;
    
    // Create the group first
    const { data: group, error: groupError } = await supabaseServer()
      .from('groups')
      .insert(dbData)
      .select('*')
      .single();
    
    if (groupError) {
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    // Update categories to belong to this group if provided
    if (categoryIds && categoryIds.length > 0) {
      const { error: categoriesError } = await supabaseServer()
        .from('categories')
        .update({ group_id: group.id })
        .in('id', categoryIds);

      if (categoriesError) {
        // Rollback group creation
        await supabaseServer().from('groups').delete().eq('id', group.id);
        return NextResponse.json({ error: 'Failed to assign categories to group' }, { status: 500 });
      }
    }

    // Fetch the complete group with categories
    const { data: completeGroup, error: fetchError } = await supabaseServer()
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
      .eq('id', group.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch complete group' }, { status: 500 });
    }

    return NextResponse.json({ success: true, group: completeGroup });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
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

    const { id, categoryIds, ...updates } = await req.json();
    
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
      // Remove all categories from this group first
      const { error: removeError } = await supabaseServer()
        .from('categories')
        .update({ group_id: null })
        .eq('group_id', id);

      if (removeError) {
        return NextResponse.json({ error: 'Failed to remove existing categories from group' }, { status: 500 });
      }

      // Assign new categories to this group
      if (categoryIds.length > 0) {
        const { error: categoriesError } = await supabaseServer()
          .from('categories')
          .update({ group_id: id })
          .in('id', categoryIds);

        if (categoriesError) {
          return NextResponse.json({ error: 'Failed to assign categories to group' }, { status: 500 });
        }
      }
    }

    // Fetch the complete group with categories
    const { data: completeGroup, error: fetchError } = await supabaseServer()
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

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Remove categories from this group (unlink, don't delete)
    const { error: categoriesError } = await supabaseServer()
      .from('categories')
      .update({ group_id: null })
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
