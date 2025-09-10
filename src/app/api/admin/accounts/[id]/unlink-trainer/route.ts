import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/accounts\/(.+?)\/unlink-trainer/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const accountId = extractIdFromUrl(request);
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
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

    // Check if account exists and get current trainer link
    const { data: account, error: accountError } = await supabaseServer()
      .from('user_profiles')
      .select('account_id, trainer_id')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (!account.trainer_id) {
      return NextResponse.json({ 
        error: 'Account is not linked to any trainer',
        details: 'No trainer link found for this account'
      }, { status: 400 });
    }

    // Unlink trainer from account
    const { error: unlinkError } = await supabaseServer()
      .from('trainers')
      .update({ account_id: null })
      .eq('id', account.trainer_id);

    if (unlinkError) {
      console.error('Error unlinking trainer from account:', unlinkError);
      return NextResponse.json({ error: 'Failed to unlink trainer from account', details: unlinkError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Trainer unlinked from account successfully',
      account: {
        id: account.account_id,
        trainer_id: null
      }
    });
  } catch (e) {
    console.error('Internal server error:', e);
    return NextResponse.json({ error: 'Internal server error', details: String(e) }, { status: 500 });
  }
}
