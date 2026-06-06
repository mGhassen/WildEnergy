import { NextRequest, NextResponse } from 'next/server';
import { resolveAccessiblePortals } from '@/lib/resolve-accessible-portals';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required',
      }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !session || !user) {
      if (error?.message === 'Email not confirmed') {
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .single();

        if (!profileError && userProfile) {
          return NextResponse.json({
            success: false,
            error: 'Email not confirmed',
            redirectTo: `/auth/account-status?email=${encodeURIComponent(email)}`,
            status: 'pending',
            authStatus: 'unconfirmed'
          }, { status: 403 });
        }
      }
      
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password',
        details: error?.message,
      }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', user.email)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User account not found. Please sign up first.',
      }, { status: 401 });
    }

    if (userProfile.account_status === 'archived') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending admin approval. Please wait for approval before logging in.',
      }, { status: 403 });
    }
    if (userProfile.account_status === 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending invitation acceptance. Please check your email and accept the invitation.',
      }, { status: 403 });
    }
    if (userProfile.account_status === 'suspended') {
      return NextResponse.json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
      }, { status: 403 });
    }
    if (userProfile.account_status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Account is not active. Please contact support.',
      }, { status: 403 });
    }

    const { error: lastLoginError } = await supabase
      .from('accounts')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userProfile.account_id);
    if (lastLoginError) {
      console.warn('Failed to update accounts.last_login:', lastLoginError.message);
    }

    const provider = user.app_metadata?.provider || 'email';
    
    return NextResponse.json({
      success: true,
      session,
      user: {
        id: userProfile.account_id,
        account_id: userProfile.account_id,
        email: user.email || '',
        profileEmail: userProfile.profile_email || '',
        isAdmin: Boolean(userProfile.is_admin),
        firstName: userProfile.first_name || user.email?.split('@')[0] || 'User',
        lastName: userProfile.last_name || '',
        phone: userProfile.phone || '',
        age: userProfile.date_of_birth ? new Date().getFullYear() - new Date(userProfile.date_of_birth).getFullYear() : 0,
        profession: userProfile.profession || '',
        address: userProfile.address || '',
        status: userProfile.account_status || 'active',
        credit: userProfile.credit ?? 0,
        role: userProfile.user_type === 'admin' || userProfile.user_type === 'admin_member' || userProfile.user_type === 'admin_trainer' || userProfile.user_type === 'admin_member_trainer' ? 'admin' : 'member',
        userType: userProfile.user_type,
        accessiblePortals: resolveAccessiblePortals(userProfile),
        member_id: userProfile.member_id,
        trainer_id: userProfile.trainer_id,
        provider: provider,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during login',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
