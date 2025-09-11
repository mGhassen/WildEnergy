import { NextRequest, NextResponse } from 'next/server';
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

    // First attempt authentication with Supabase
    console.log('🔐 Attempting login for email:', email);
    const { data: { session, user }, error } = await supabaseServer().auth.signInWithPassword({
      email,
      password,
    });

    console.log('🔐 Auth result:', { 
      hasError: !!error, 
      error: error?.message, 
      hasSession: !!session, 
      hasUser: !!user,
      userId: user?.id 
    });

    if (error || !session || !user) {
      console.log('❌ Auth failed:', error?.message);
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password',
        details: error?.message,
      }, { status: 401 });
    }

    // Now get user profile from new user system by email (since account_id doesn't match auth user ID)
    console.log('👤 Looking for user profile with email:', user.email);
    const { data: userProfile, error: profileError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('account_email', user.email)
      .single();

    console.log('👤 Profile query result:', { 
      hasError: !!profileError, 
      error: profileError?.message, 
      hasProfile: !!userProfile,
      profileId: userProfile?.account_id 
    });

    if (profileError || !userProfile) {
      console.log('❌ Profile not found:', profileError?.message);
      return NextResponse.json({
        success: false,
        error: 'User account not found. Please sign up first.',
      }, { status: 401 });
    }

    // Check user status after successful authentication
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

    // Return session and user info
    console.log('Login API returning session:', {
      access_token: session?.access_token ? 'present' : 'missing',
      refresh_token: session?.refresh_token ? 'present' : 'missing',
      expires_at: session?.expires_at,
    });
    
    return NextResponse.json({
      success: true,
      session,
      user: {
        id: userProfile.account_id,
        email: user.email || '',
        isAdmin: Boolean(userProfile.is_admin),
        firstName: userProfile.first_name || user.email?.split('@')[0] || 'User',
        lastName: userProfile.last_name || '',
        status: userProfile.account_status || 'active',
        credit: userProfile.credit ?? 0,
        userType: userProfile.user_type,
        accessiblePortals: userProfile.accessible_portals,
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