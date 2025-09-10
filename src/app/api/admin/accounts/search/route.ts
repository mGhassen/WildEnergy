import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Search for accounts that are not linked to any member
    let queryBuilder = supabaseServer()
      .from('user_profiles')
      .select('account_id, email, first_name, last_name, created_at, user_type')
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
      return NextResponse.json({ error: 'Failed to search accounts' }, { status: 500 });
    }

    // Format the response
    const formattedAccounts = (accounts || []).map(account => ({
      id: account.account_id,
      email: account.email,
      firstName: account.first_name,
      lastName: account.last_name,
      fullName: `${account.first_name} ${account.last_name}`.trim(),
      userType: account.user_type,
      createdAt: account.created_at
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
