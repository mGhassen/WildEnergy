import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    // Find user in users table
    const { data: user, error: userError } = await supabaseServer()
      .from('users')
      .select('auth_user_id')
      .eq('email', email)
      .single();
    if (userError || !user?.auth_user_id) {
      return NextResponse.json({ confirmedAt: null });
    }
    // Get user from Supabase Auth
    const { data: authUser, error: authUserError } = await supabaseServer().auth.admin.getUserById(user.auth_user_id);
    if (authUserError || !authUser?.user) {
      return NextResponse.json({ confirmedAt: null });
    }
    return NextResponse.json({ confirmedAt: authUser.user.confirmed_at || null });
  } catch (error: any) {
    return NextResponse.json({ confirmedAt: null, error: error.message }, { status: 500 });
  }
} 