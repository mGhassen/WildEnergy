import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/accounts\/(.+?)\/unlink-member/);
  return match ? match[1] : null;
}

async function verifyAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };
  }

  const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !adminUser) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', adminUser.email)
    .single();

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { adminUser };
}

export async function POST(request: NextRequest) {
  try {
    const accountId = extractIdFromUrl(request);
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) return authResult.error;

    // Find member linked to this account
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Account is not linked to any member' }, { status: 400 });
    }

    // Unlink member from account
    const { error: unlinkError } = await supabaseServer()
      .from('members')
      .update({ account_id: null })
      .eq('id', member.id);

    if (unlinkError) {
      return NextResponse.json({ error: 'Failed to unlink member from account' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account unlinked from member successfully'
    });
  } catch (error) {
    console.error('Unlink member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
