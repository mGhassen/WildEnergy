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

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseServer()
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
      }, { status: 404 });
    }

    // Check if user has auth account
    let authStatus = 'unknown';
    if (userProfile.auth_user_id) {
      const { data: authUser, error: authUserError } = await supabaseServer().auth.admin.getUserById(userProfile.auth_user_id);
      if (!authUserError && authUser?.user) {
        authStatus = authUser.user.confirmed_at ? 'confirmed' : 'unconfirmed';
      }
    }

    return NextResponse.json({
      success: true,
      status: userProfile.status,
      authStatus,
      email: userProfile.email,
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
      message: getStatusMessage(userProfile.status, authStatus),
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

function getStatusMessage(status: string, authStatus: string): string {
  switch (status) {
    case 'active':
      return 'Account is active and ready to use.';
    case 'archived':
      return 'Account is pending admin approval. Please wait for approval.';
    case 'pending':
      if (authStatus === 'unconfirmed') {
        return 'Account is pending email confirmation. Please check your email and click the confirmation link.';
      }
      return 'Account is pending invitation acceptance.';
    case 'suspended':
      return 'Account has been suspended. Please contact support.';
    default:
      return 'Account status is unknown. Please contact support.';
  }
} 