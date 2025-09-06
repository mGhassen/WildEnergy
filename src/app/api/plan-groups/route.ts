import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
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

    // Get plan_id from query params
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get('plan_id');

    let query = supabase
      .from('plan_groups')
      .select(`
        *,
        categories (
          id,
          name,
          description,
          color
        )
      `)
      .order('created_at', { ascending: false });

    if (planId) {
      query = query.eq('plan_id', planId);
    }

    const { data: planGroups, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch plan groups' }, { status: 500 });
    }

    return NextResponse.json(planGroups);
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

    const planGroupData = await req.json();
    const { data: planGroup, error } = await supabase
      .from('plan_groups')
      .insert(planGroupData)
      .select(`
        *,
        categories (
          id,
          name,
          description,
          color
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create plan group' }, { status: 500 });
    }

    return NextResponse.json({ success: true, planGroup });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create plan group' }, { status: 500 });
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

    const { id, ...updates } = await req.json();
    const { data: planGroup, error } = await supabase
      .from('plan_groups')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        categories (
          id,
          name,
          description,
          color
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update plan group' }, { status: 500 });
    }

    return NextResponse.json({ success: true, planGroup });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update plan group' }, { status: 500 });
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Plan group ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('plan_groups')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete plan group' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete plan group' }, { status: 500 });
  }
}
