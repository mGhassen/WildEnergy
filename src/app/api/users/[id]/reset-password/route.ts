import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  context: { params: any }
) {
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

    const userId = context.params.id;

    // Get user email
    const { data: user, error: userError } = await supabaseServer()
      .from('users')
      .select('email, auth_user_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.auth_user_id) {
      return NextResponse.json({ error: 'User has no auth account' }, { status: 400 });
    }

    // Send password reset email using the client (anon key)
    const { createSupabaseClient } = await import('@/lib/supabase');
    const supabase = createSupabaseClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });

    if (resetError) {
      return NextResponse.json({ 
        error: 'Failed to send password reset email',
        details: resetError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password reset email sent successfully' 
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
} 