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

    // Try to sign in with the provided credentials
    const { data: { session, user }, error } = await supabaseServer().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: error.message,
      }, { status: 401 });
    }

    if (!session || !user) {
      return NextResponse.json({
        success: false,
        error: 'No session or user returned',
      }, { status: 401 });
    }

    // Check if user exists in our database
    const { data: userProfile, error: profileError } = await supabaseServer()
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      message: 'User authentication successful',
      authUser: {
        id: user.id,
        email: user.email,
      },
      session: {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at,
      },
      profile: userProfile ? {
        id: userProfile.id,
        status: userProfile.status,
        is_admin: userProfile.is_admin,
      } : null,
      profileError: profileError?.message,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Test user API failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 