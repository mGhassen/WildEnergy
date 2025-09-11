import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/accounts\/(.+?)\/link-member/);
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

    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) return authResult.error;

    // Check if account exists
    const { data: account, error: accountError } = await supabaseServer()
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 400 });
    }

    // Check if member exists
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 400 });
    }

    // Check if account is already linked to a member
    const { data: existingMember } = await supabaseServer()
      .from('members')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Account is already linked to a member' }, { status: 400 });
    }

    // Check if member already has an account
    if (member.account_id) {
      return NextResponse.json({ error: 'Member is already linked to an account' }, { status: 400 });
    }

    // Link account to member
    const { error: linkError } = await supabaseServer()
      .from('members')
      .update({ account_id: accountId })
      .eq('id', memberId);

    if (linkError) {
      return NextResponse.json({ error: 'Failed to link account to member' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account linked to member successfully'
    });
  } catch (error) {
    console.error('Link member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
