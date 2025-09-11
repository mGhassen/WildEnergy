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

    const params = await context.params;
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user email
    console.log('Looking up user with ID:', userId);
    const { data: user, error: userError } = await supabaseServer()
      .from('user_profiles')
      .select('email, auth_user_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User lookup error:', userError);
      return NextResponse.json({ error: 'User not found', details: userError.message }, { status: 404 });
    }
    
    if (!user) {
      console.error('User not found for ID:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.auth_user_id) {
      return NextResponse.json({ error: 'User has no auth account' }, { status: 400 });
    }

    // Send password reset email using the service role key for admin operations
    const { createSupabaseAdminClient } = await import('@/lib/supabase');
    const supabase = createSupabaseAdminClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset-password`;
    
    console.log('Sending password reset email to:', user.email);
    console.log('Redirect URL:', redirectTo);
    
    const { error: resetError } = await supabaseServer().auth.resetPasswordForEmail(user.email, { redirectTo });

    if (resetError) {
      console.error('Password reset error:', resetError);
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