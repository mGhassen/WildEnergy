import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const memberId = searchParams.get('memberId'); // Get memberId to check if member already has account

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

    // If memberId is provided, check if the member already has an account linked
    if (memberId) {
      const { data: member, error: memberError } = await supabaseServer()
        .from('members')
        .select('account_id')
        .eq('id', memberId)
        .single();

      if (memberError) {
        return NextResponse.json({ error: 'Failed to check member status' }, { status: 500 });
      }

      if (member?.account_id) {
        return NextResponse.json({ 
          error: 'Member already has an account linked',
          accounts: [],
          total: 0,
          query
        });
      }
    }

    // Search for accounts that are not linked to any member
    let queryBuilder = supabaseServer()
      .from('user_profiles')
      .select('account_id, email, first_name, last_name, user_type')
      .is('member_id', null) // Only accounts not linked to members
      .limit(limit);

    if (query.trim()) {
      // Search by email, first name, or last name
      queryBuilder = queryBuilder.or(
        `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`
      );
    }

    const { data: accounts, error } = await queryBuilder;

    if (error) {
      console.error('Account search error:', error);
      return NextResponse.json({ error: 'Failed to search accounts', details: error.message }, { status: 500 });
    }

    // Format the response to match the Account interface
    const formattedAccounts = (accounts || []).map(account => ({
      account_id: account.account_id,
      email: account.email,
      first_name: account.first_name,
      last_name: account.last_name,
      user_type: account.user_type,
      // Add required fields with defaults
      account_status: 'active',
      is_admin: false,
      accessible_portals: ['member']
    }));

    return NextResponse.json({
      accounts: formattedAccounts,
      total: formattedAccounts.length,
      query
    });

  } catch (error) {
    console.error('Account search error:', error);
    return NextResponse.json({ error: 'Failed to search accounts' }, { status: 500 });
  }
}
