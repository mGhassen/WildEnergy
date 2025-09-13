import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { mapMemberStatusToAccountStatus } from '@/lib/status-mapping';

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
    const accountId = request.url.split('/').slice(-2, -1)[0];
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const { memberNotes, credit, status } = await request.json();

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
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if account already has a member
    const { data: existingMember } = await supabaseServer()
      .from('members')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Account already has a member record' }, { status: 400 });
    }

    // Create member record
    const memberStatus = status || 'active';
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .insert({
        account_id: accountId,
        profile_id: account.profile_id, // Use the account's profile_id
        member_notes: memberNotes || '',
        credit: credit || 0,
        status: memberStatus,
      })
      .select()
      .single();

    if (memberError) {
      return NextResponse.json({ error: memberError.message || 'Failed to create member record' }, { status: 500 });
    }

    // Update account status to match member status
    const accountStatus = mapMemberStatusToAccountStatus(memberStatus);
    const { error: accountStatusError } = await supabaseServer()
      .from('accounts')
      .update({ status: accountStatus })
      .eq('id', accountId);

    if (accountStatusError) {
      console.error('Failed to sync account status with member status:', accountStatusError);
      // Don't fail the request, just log the error
    }

    // Return the updated account with member info
    const { data: updatedAccount, error: updatedAccountError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (updatedAccountError) {
      return NextResponse.json({ error: 'Failed to fetch updated account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member created successfully',
      account: updatedAccount
    });

  } catch (error) {
    console.error('Create member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
