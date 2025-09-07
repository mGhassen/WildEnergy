import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    // Fetch all categories with group information
    console.log('Fetching categories from database...');
    const { data: categories, error } = await supabaseServer()
      .from('categories')
      .select(`
        *,
        groups (
          id,
          name,
          color
        )
      `)
      .order('created_at', { ascending: false });
    
    console.log('Categories query result:', { categories, error });
    
    if (error) {
      console.error('Categories fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
    
    console.log('Returning categories:', categories);
    return NextResponse.json(categories);
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
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { name, description, groupId } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    
    // Prepare the data to insert
    const insertData: any = { name, description };
    if (groupId !== undefined && groupId !== null) {
      insertData.group_id = groupId;
    }
    
    const { data: category, error } = await supabaseServer()
      .from('categories')
      .insert(insertData)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
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
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
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
    
    // Handle groupId mapping
    if ('groupId' in updates) {
      console.log('groupId found:', updates.groupId);
      if (updates.groupId === undefined || updates.groupId === null) {
        updateData.group_id = null;
      } else {
        updateData.group_id = updates.groupId;
      }
    }
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
    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id } = await req.json();
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