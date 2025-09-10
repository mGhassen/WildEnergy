import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await context.params;
    const { accountId } = await request.json();
    
    if (!memberId || !accountId) {
      return NextResponse.json({ error: 'Member ID and Account ID are required' }, { status: 400 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token
    const { data: { user: authUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', authUser.email)
      .single();

    if (profileError || !profile || !profile.is_admin || !profile.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Check if the member exists
    const { data: member, error: memberError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if the account exists
    const { data: account, error: accountError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if the account is already linked to a member
    if (account.member_id) {
      return NextResponse.json({ 
        error: 'Account is already linked to a member',
        details: { linkedMemberId: account.member_id }
      }, { status: 400 });
    }

    // Check if the member already has an account linked
    if (member.account_id) {
      return NextResponse.json({ 
        error: 'Member already has an account linked',
        details: { linkedAccountId: member.account_id }
      }, { status: 400 });
    }

    // Link the account to the member
    const { error: linkError } = await supabaseServer()
      .from('user_profiles')
      .update({ 
        account_id: accountId,
        member_id: memberId,
        updated_at: new Date().toISOString()
      })
      .eq('member_id', memberId);

    if (linkError) {
      console.error('Link account error:', linkError);
      return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
    }

    // Create audit log entry
    await supabaseServer()
      .from('audit_logs')
      .insert({
        action: 'link_account',
        table_name: 'user_profiles',
        record_id: memberId,
        old_values: { account_id: member.account_id },
        new_values: { account_id: accountId },
        user_id: authUser.id,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Account linked successfully',
      data: {
        memberId,
        accountId,
        memberEmail: member.email,
        accountEmail: account.email
      }
    });

  } catch (error) {
    console.error('Link account error:', error);
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
  }
}
