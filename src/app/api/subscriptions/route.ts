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
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    // Fetch all subscriptions
    const { data: subscriptions, error } = await supabaseServer
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }
    return NextResponse.json(subscriptions);
  } catch {
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
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const subData = await req.json();
    const { data: subscription, error } = await supabaseServer
      .from('subscriptions')
      .insert(subData)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }
    return NextResponse.json({ success: true, subscription });
  } catch {
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
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
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id, ...updates } = await req.json();
    const { data: subscription, error } = await supabaseServer
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }
    return NextResponse.json({ success: true, subscription });
  } catch {
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
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
    const { data: { user: adminUser }, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();
    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    const { id } = await req.json();
    const { error } = await supabaseServer
      .from('subscriptions')
      .delete()
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
} 