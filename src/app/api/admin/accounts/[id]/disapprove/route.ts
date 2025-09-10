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

    // Get user current status from accounts table
    const { data: account, error: accountError } = await supabaseServer()
      .from('accounts')
      .select('status, email')
      .eq('id', userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.status !== 'pending') {
      return NextResponse.json({ 
        error: `Account cannot be disapproved. Current status: ${account.status}` 
      }, { status: 400 });
    }

    // Update account status to archived (disapproved)
    const { data: updatedAccount, error: updateError } = await supabaseServer()
      .from('accounts')
      .update({ status: 'archived' })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to disapprove account',
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account disapproved successfully',
      account: updatedAccount
    });

  } catch (error: any) {
    console.error('Disapprove user error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
