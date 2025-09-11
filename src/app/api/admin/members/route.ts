import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

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
    
    // Fetch linked members using new system with subscriptions
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
          updated_at
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
      .select(`
        *,
        profiles!inner(
          first_name,
          last_name,
          phone,
          date_of_birth,
          address,
          profession,
          emergency_contact_name,
          emergency_contact_phone,
          profile_image_url
        ),
        subscriptions:subscriptions(
          id,
          member_id,
          plan_id,
          start_date,
          end_date,
          status,
          notes,
          created_at,
          updated_at
        )
      `)
      .is('account_id', null) // Only unlinked members
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    if (unlinkedError) {
      console.error('Error fetching unlinked members:', unlinkedError);
      return NextResponse.json({ error: 'Failed to fetch unlinked members' }, { status: 500 });
    }

    // Format linked members
    const linkedMembersFormatted = (linkedMembers || []).map((m: any) => ({ 
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
      user_type: m.user_type,
      accessible_portals: m.accessible_portals,
      subscriptions: m.subscriptions || [],
      groupSessions: m.subscriptions?.[0]?.subscription_group_sessions || []
    }));

    // Format unlinked members
    const unlinkedMembersFormatted = (unlinkedMembers || []).map((m: any) => ({ 
      id: m.id,
      account_id: null,
      first_name: m.profiles.first_name,
      last_name: m.profiles.last_name,
      email: null, // No email for unlinked members
      phone: m.profiles.phone,
      is_member: true,
      credit: m.credit ?? 0,
      member_notes: m.member_notes,
      member_status: m.status,
      user_type: 'member',
      accessible_portals: ['member'],
      subscriptions: m.subscriptions || [],
      groupSessions: m.subscriptions?.[0]?.subscription_group_sessions || []
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