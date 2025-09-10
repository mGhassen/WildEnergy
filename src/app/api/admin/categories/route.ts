import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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
    // Fetch all categories with group information via junction table
    console.log('Fetching categories from database...');
    const { data: categories, error } = await supabaseServer()
      .from('categories')
      .select(`
        *,
        category_groups (
          groups (
            id,
            name,
            color
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    console.log('Categories query result:', { categories, error });
    
    if (error) {
      console.error('Categories fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
    
    // Transform the data to match the expected interface
    const transformedCategories = categories?.map(category => ({
      ...category,
      groups: category.category_groups?.map((cg: any) => cg.groups) || []
    })) || [];
    
    console.log('Returning categories:', transformedCategories);
    return NextResponse.json(transformedCategories);
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
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { name, description, color, group_ids } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    
    // Prepare the data to insert
    const insertData: any = { name, description };
    if (color) {
      insertData.color = color;
    }
    
    const { data: category, error } = await supabaseServer()
      .from('categories')
      .insert(insertData)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
    
    // Create category-group relationships if group_ids provided
    if (group_ids && group_ids.length > 0) {
      const categoryGroupRelations = group_ids.map((groupId: number) => ({
        category_id: category.id,
        group_id: groupId
      }));
      
      const { error: relationsError } = await supabaseServer()
        .from('category_groups')
        .insert(categoryGroupRelations);
      
      if (relationsError) {
        console.error('Failed to create category-group relations:', relationsError);
        // Don't fail the request, just log the error
      }
    }
    
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const requestBody = await req.json();
    console.log('PUT request body:', requestBody);
    const { id, ...updates } = requestBody;
    console.log('Extracted id:', id, 'updates:', updates);
    
    // Handle field mapping from camelCase to snake_case
    const updateData: any = {};
    
    // Map camelCase fields to snake_case
    if ('name' in updates) updateData.name = updates.name;
    if ('description' in updates) updateData.description = updates.description;
    if ('color' in updates) updateData.color = updates.color;
    if ('isActive' in updates) updateData.is_active = updates.isActive;
    
    console.log('Final updateData:', updateData);
    
    const { data: category, error } = await supabaseServer()
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: 'Failed to update category', details: error.message }, { status: 500 });
    }
    
    // Handle group relationships if group_ids provided
    if ('group_ids' in updates) {
      console.log('group_ids found:', updates.group_ids);
      
      // First, delete existing relationships
      const { error: deleteError } = await supabaseServer()
        .from('category_groups')
        .delete()
        .eq('category_id', id);
      
      if (deleteError) {
        console.error('Failed to delete existing category-group relations:', deleteError);
      }
      
      // Then create new relationships if any
      if (updates.group_ids && updates.group_ids.length > 0) {
        const categoryGroupRelations = updates.group_ids.map((groupId: number) => ({
          category_id: id,
          group_id: groupId
        }));
        
        const { error: relationsError } = await supabaseServer()
          .from('category_groups')
          .insert(categoryGroupRelations);
        
        if (relationsError) {
          console.error('Failed to create category-group relations:', relationsError);
        }
      }
    }
    
    return NextResponse.json({ success: true, category });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
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
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id } = await req.json();
    
    // First, unlink all classes from this category (set category_id to null)
    const { error: unlinkError } = await supabaseServer()
      .from('classes')
      .update({ category_id: null })
      .eq('category_id', id);
    
    if (unlinkError) {
      return NextResponse.json({ error: 'Failed to unlink classes from category' }, { status: 500 });
    }
    
    // Then delete the category
    const { error } = await supabaseServer()
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
} 