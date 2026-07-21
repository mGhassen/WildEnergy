import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function verifyAdminAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
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

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(req);
    if (authResult.error) return authResult.error;

    const { firstName, lastName, phone, profileEmail, memberNotes, credit, status } = await req.json();

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseServer()
      .from('profiles')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone?.trim() || null,
        profile_email: profileEmail?.trim() || null,
      })
      .select()
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: profileError?.message || 'Failed to create profile' },
        { status: 500 }
      );
    }

    const memberStatus = status || 'active';
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .insert({
        account_id: null,
        profile_id: profile.id,
        member_notes: memberNotes || '',
        credit: credit ?? 0,
        status: memberStatus,
      })
      .select()
      .single();

    if (memberError || !member) {
      await supabaseServer().from('profiles').delete().eq('id', profile.id);
      return NextResponse.json(
        { error: memberError?.message || 'Failed to create member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: member.id,
        account_id: null,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: null,
        profile_email: profile.profile_email,
        phone: profile.phone,
        credit: member.credit,
        member_notes: member.member_notes,
        member_status: member.status,
        created_at: member.created_at,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create member error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
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
    
    // Fetch linked members using new system with subscriptions and group sessions
    const { data: linkedMembers, error: linkedError } = await supabaseServer()
      .from('user_profiles')
      .select(`
        *,
        subscriptions:subscriptions(
          id,
          member_id,
          plan_id,
          start_date,
          end_date,
          status,
          notes,
          created_at,
          updated_at,
          subscription_group_sessions:subscription_group_sessions(
            id,
            group_id,
            sessions_remaining,
            total_sessions,
            groups:groups(
              id,
              name
            )
          )
        )
      `)
      .not('member_id', 'is', null) // Only users with member records
      .eq('member_status', 'active')
      .order('first_name', { ascending: true });
    
    if (linkedError) {
      console.error('Error fetching linked members:', linkedError);
      return NextResponse.json({ error: 'Failed to fetch linked members' }, { status: 500 });
    }

    // Fetch unlinked members directly from members table
    const { data: unlinkedMembers, error: unlinkedError } = await supabaseServer()
      .from('members')
      .select('*')
      .is('account_id', null) // Only unlinked members
      .eq('status', 'active');

    if (unlinkedError) {
      console.error('Error fetching unlinked members:', unlinkedError);
      return NextResponse.json({ error: 'Failed to fetch unlinked members' }, { status: 500 });
    }

    // Fetch profiles for unlinked members
    const profileIds = unlinkedMembers?.map(m => m.profile_id).filter(Boolean) || [];
    const { data: unlinkedProfiles, error: profilesError } = await supabaseServer()
      .from('profiles')
      .select('*')
      .in('id', profileIds);

    if (profilesError) {
      console.error('Error fetching unlinked profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch unlinked profiles' }, { status: 500 });
    }

    // Combine members with their profiles
    const unlinkedMembersWithProfiles = unlinkedMembers?.map(member => ({
      ...member,
      profiles: unlinkedProfiles?.find(p => p.id === member.profile_id) || null
    })) || [];

    // Format linked members
    const linkedMembersFormatted = (linkedMembers || []).map((m: any) => {
      // Flatten group sessions from all subscriptions
      const allGroupSessions = (m.subscriptions || []).flatMap((sub: any) => 
        (sub.subscription_group_sessions || []).map((sgs: any) => ({
          group_id: sgs.group_id,
          group_name: sgs.groups?.name || 'Unknown Group',
          sessions_remaining: sgs.sessions_remaining,
          total_sessions: sgs.total_sessions,
          subscription_id: sub.id
        }))
      );

      return { 
        id: m.member_id,
        account_id: m.account_id,
        first_name: m.first_name,
        last_name: m.last_name,
        email: m.email,
        phone: m.phone,
        is_member: true,
        credit: m.credit ?? 0,
        member_notes: m.member_notes,
        member_status: m.member_status,
        account_status: m.account_status, // Include account status
        user_type: m.user_type,
        accessible_portals: m.accessible_portals,
        created_at: m.created_at,
        subscriptions: m.subscriptions || [],
        groupSessions: allGroupSessions
      };
    });

    // Format unlinked members
    const unlinkedMembersFormatted = unlinkedMembersWithProfiles.map((m: any) => ({ 
      id: m.id,
      account_id: null,
      first_name: m.profiles?.first_name || 'Unknown',
      last_name: m.profiles?.last_name || 'User',
      email: null, // No account email for unlinked members
      profile_email: m.profiles?.profile_email || null,
      phone: m.profiles?.phone,
      is_member: true,
      credit: m.credit ?? 0,
      member_notes: m.member_notes,
      member_status: m.status,
      user_type: 'member',
      accessible_portals: ['member'],
      created_at: m.created_at,
      subscriptions: [],
      groupSessions: []
    }));

    // Combine both lists
    const allMembers = [...linkedMembersFormatted, ...unlinkedMembersFormatted];
    
    // Sort by first name
    allMembers.sort((a, b) => a.first_name.localeCompare(b.first_name));
    
    return NextResponse.json(allMembers);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 