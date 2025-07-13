import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No token provided',
      }, { status: 401 });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token',
      }, { status: 401 });
    }

    // Get user profile
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (dbError || !userData) {
      return NextResponse.json({
        success: false,
        error: 'User profile not found',
        userId: user.id,
      }, { status: 404 });
    }

    // Status checks
    if (userData.status === 'onhold') {
      return NextResponse.json({
        success: false,
        error: 'Account is pending approval. Please wait for admin approval.',
        status: 'onhold',
      }, { status: 403 });
    }
    if (userData.status === 'suspended') {
      return NextResponse.json({
        success: false,
        error: 'Account has been suspended. Please contact support.',
        status: 'suspended',
      }, { status: 403 });
    }
    if (userData.status === 'inactive') {
      return NextResponse.json({
        success: false,
        error: 'Account is inactive. Please contact support.',
        status: 'inactive',
      }, { status: 403 });
    }

    // Return user info
    const userResponse = {
      id: userData.id,
      email: user.email || '',
      isAdmin: Boolean(userData.is_admin),
      firstName: userData.first_name || user.email?.split('@')[0] || 'User',
      lastName: userData.last_name || '',
      status: userData.status || 'active',
      credit: userData.credit ?? 0,
    };

    return NextResponse.json({
      success: true,
      user: userResponse,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred during session check',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 