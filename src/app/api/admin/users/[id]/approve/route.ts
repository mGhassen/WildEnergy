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

    // Get user current status
    const { data: user, error: userError } = await supabaseServer()
      .from('users')
      .select('status, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'archived') {
      return NextResponse.json({ 
        error: `User cannot be approved. Current status: ${user.status}` 
      }, { status: 400 });
    }

    // Update user status to active
    const { data: updatedUser, error: updateError } = await supabaseServer()
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to approve user',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'User approved successfully',
      user: updatedUser
    });

  } catch (error: any) {
    console.error('Approve user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
} 