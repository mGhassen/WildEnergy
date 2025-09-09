import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required',
      }, { status: 400 });
    }

    // Get user by email from new user system
    const { data: user, error: userError } = await supabaseServer()
      .from('user_profiles')
      .select('email, account_id, account_status')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    if (!user.account_id) {
      return NextResponse.json({
        success: false,
        error: 'User has no auth account',
      }, { status: 400 });
    }

    // Check if user is already confirmed in Supabase Auth
    const { data: authUser, error: authUserError } = await supabaseServer().auth.admin.getUserById(user.account_id);
    if (authUserError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found in Supabase Auth',
      }, { status: 404 });
    }

    if (authUser.user?.confirmed_at) {
      return NextResponse.json({
        success: false,
        error: 'User is already confirmed. You can now log in.',
      }, { status: 400 });
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
        success: false,
        error: 'Failed to send confirmation email',
        details: inviteError.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully. Please check your inbox.',
    });

  } catch (error: any) {
    console.error('Resend confirmation error:', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 