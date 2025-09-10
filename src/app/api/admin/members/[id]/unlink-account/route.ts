import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await context.params;
    
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
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

    // Check if the member exists and get current account info
    const { data: member, error: memberError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.account_id) {
      return NextResponse.json({ 
        error: 'Member does not have an account linked' 
      }, { status: 400 });
    }

    const linkedAccountId = member.account_id;

    // Unlink the account from the member
    const { error: unlinkError } = await supabaseServer()
      .from('user_profiles')
      .update({ 
        account_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('member_id', memberId);

    if (unlinkError) {
      console.error('Unlink account error:', unlinkError);
      return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 });
    }

    // Create audit log entry
    await supabaseServer()
      .from('audit_logs')
      .insert({
        action: 'unlink_account',
        table_name: 'user_profiles',
        record_id: memberId,
        old_values: { account_id: linkedAccountId },
        new_values: { account_id: null },
        user_id: authUser.id,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Account unlinked successfully',
      data: {
        memberId,
        unlinkedAccountId: linkedAccountId,
        memberEmail: member.email
      }
    });

  } catch (error) {
    console.error('Unlink account error:', error);
    return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 });
  }
}
