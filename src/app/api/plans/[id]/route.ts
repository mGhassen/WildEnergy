import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/plans\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  const id = extractIdFromUrl(request);
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 401 });
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
  }
  const { data: plan, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !plan) {
    return NextResponse.json({ message: 'Plan not found', details: error }, { status: 404 });
  }
  return NextResponse.json(plan);
}

export async function PUT(request: NextRequest) {
  const id = extractIdFromUrl(request);
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 401 });
  }
  const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !adminUser) {
    return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
  }
  const { data: adminCheck } = await supabase
    .from('users')
    .select('is_admin')
    .eq('auth_user_id', adminUser.id)
    .single();
  if (!adminCheck?.is_admin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }
  const updates = await request.json();
  if ('id' in updates) delete updates.id;
  const { data: plan, error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', Number(id))
    .select('*')
    .single();
  if (error || !plan) {
    return NextResponse.json({ message: error?.message || 'Failed to update plan', details: error }, { status: 500 });
  }
  return NextResponse.json({ success: true, plan });
}

export async function DELETE(request: NextRequest) {
  const id = extractIdFromUrl(request);
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: 'No token provided' }, { status: 401 });
  }
  const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !adminUser) {
    return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
  }
  const { data: adminCheck } = await supabase
    .from('users')
    .select('is_admin')
    .eq('auth_user_id', adminUser.id)
    .single();
  if (!adminCheck?.is_admin) {
    return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
  }
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id);
  if (error) {
    return NextResponse.json({ message: error?.message || 'Failed to delete plan', details: error }, { status: 500 });
  }
  return NextResponse.json({ success: true });
} 