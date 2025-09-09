import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    const { data: category, error } = await supabaseServer()
      .from('categories')
      .select(`
        *,
        groups (
          id,
          name,
          color
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Category fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Category fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const updates = await request.json();
    
    console.log('Category update request:', { id, updates });
    console.log('groupId value:', updates.groupId, 'type:', typeof updates.groupId);
    console.log('group_id value:', updates.group_id, 'type:', typeof updates.group_id);

    // Convert camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    // Handle both groupId (camelCase) and group_id (snake_case)
    if (updates.hasOwnProperty('groupId')) {
      dbUpdates.group_id = updates.groupId;
    } else if (updates.hasOwnProperty('group_id')) {
      dbUpdates.group_id = updates.group_id;
    }
    
    console.log('Database updates:', dbUpdates);
    console.log('group_id value being set:', dbUpdates.group_id);

    const { data: category, error } = await supabaseServer()
      .from('categories')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Category update error:', error);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    console.log('Category updated successfully:', category);
    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Category update error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin using new user system
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Check if category is being used by any classes
    const { data: classesUsingCategory, error: checkError } = await supabaseServer()
      .from('classes')
      .select('id, name')
      .eq('category_id', id);

    if (checkError) {
      console.error('Error checking category usage:', checkError);
      return NextResponse.json({ error: 'Failed to check category usage' }, { status: 500 });
    }

    if (classesUsingCategory && classesUsingCategory.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that is being used by classes',
        classes: classesUsingCategory
      }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Category delete error:', error);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category delete error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
} 