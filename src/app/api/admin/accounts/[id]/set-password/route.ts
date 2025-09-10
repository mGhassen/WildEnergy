import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id: userId } = await context.params;
    const { password } = await req.json();
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Get user auth_user_id from accounts table
    const { data: account, error: accountError } = await supabaseServer()
      .from('accounts')
      .select('auth_user_id')
      .eq('id', userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.auth_user_id) {
      return NextResponse.json({ error: 'Account has no auth user' }, { status: 400 });
    }

    // Use Supabase admin API to update password
    const { createSupabaseAdminClient } = await import('@/lib/supabase');
    const supabaseAdmin = createSupabaseAdminClient();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(account.auth_user_id, { password });

    if (updateError) {
      return NextResponse.json({ error: 'Failed to set password', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password set successfully' });
  } catch (error: any) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
} 