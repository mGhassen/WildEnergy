import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Verify user is a member (not admin)
    const { data: userData } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('account_id', user.id)
      .single();

    if (userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access not allowed' }, { status: 403 });
    }

    // Fetch active categories with group information via junction table
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
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
    
    // Transform the data to match the expected interface
    const transformedCategories = categories?.map(category => ({
      ...category,
      groups: category.category_groups?.map((cg: any) => cg.groups) || []
    })) || [];
    
    return NextResponse.json(transformedCategories);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
