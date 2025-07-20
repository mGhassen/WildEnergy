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

    const params = await context.params;
    const userId = params.id;

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

    // Check if user is already confirmed in Supabase Auth
    const { data: authUser, error: authUserError } = await supabaseServer().auth.admin.getUserById(user.auth_user_id);
    if (authUserError || !authUser) {
      return NextResponse.json({ error: 'User not found in Supabase Auth', details: authUserError?.message }, { status: 404 });
    }
    if (authUser.user?.confirmed_at) {
      return NextResponse.json({ error: 'User is already confirmed. Cannot resend invitation.' }, { status: 400 });
    }
    // Resend invitation email
    const { error: inviteError } = await supabaseServer().auth.admin.inviteUserByEmail(
      user.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/accept-invitation`,
      }
    );

    if (inviteError) {
      console.error('Supabase inviteUserByEmail error:', inviteError);
      return NextResponse.json({ 
        error: 'Failed to send invitation email',
        details: inviteError.message,
        fullError: inviteError
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Invitation email sent successfully' 
    });

  } catch (error: any) {
    console.error('Resend invitation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
} 