import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
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

    // Check if the user is an admin using new user system
    const { data: profile, error: profileError } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', authUser.email)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
    }

    if (!profile || !profile.is_admin || !profile.accessible_portals?.includes('admin')) {
      console.error('Admin check failed:', { 
        isAdmin: profile?.is_admin, 
        portals: profile?.accessible_portals,
        userEmail: authUser.email 
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get member details from new user system
    // First try to find by member_id in user_profiles view
    let { data: member, error: memberError } = await supabaseServer()
      .from('user_profiles')
      .select('*')
      .eq('member_id', id)
      .single();

    // If not found by member_id, try by account_id
    if (memberError && memberError.code === 'PGRST116') {
      const fallbackResult = await supabaseServer()
        .from('user_profiles')
        .select('*')
        .eq('account_id', id)
        .single();
      
      member = fallbackResult.data;
      memberError = fallbackResult.error;
    }

    // If still not found, try to find unlinked member directly from members table
    if (memberError && memberError.code === 'PGRST116') {
      const { data: unlinkedMember, error: unlinkedError } = await supabaseServer()
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
          )
        `)
        .eq('id', id)
        .single();

      if (!unlinkedError && unlinkedMember) {
        // Create a member object in the expected format for unlinked members
        member = {
          member_id: unlinkedMember.id,
          account_id: null, // Unlinked member has no account
          email: null, // No email for unlinked members
          account_status: null,
          last_login: null,
          first_name: unlinkedMember.profiles.first_name,
          last_name: unlinkedMember.profiles.last_name,
          phone: unlinkedMember.profiles.phone,
          date_of_birth: unlinkedMember.profiles.date_of_birth,
          address: unlinkedMember.profiles.address,
          profession: unlinkedMember.profiles.profession,
          emergency_contact_name: unlinkedMember.profiles.emergency_contact_name,
          emergency_contact_phone: unlinkedMember.profiles.emergency_contact_phone,
          profile_image_url: unlinkedMember.profiles.profile_image_url,
          member_notes: unlinkedMember.member_notes,
          credit: unlinkedMember.credit,
          member_status: unlinkedMember.status,
          trainer_id: null,
          specialization: null,
          experience_years: null,
          bio: null,
          certification: null,
          hourly_rate: null,
          trainer_status: null,
          user_type: 'member', // Unlinked members are just members
          accessible_portals: ['member'] // Unlinked members only have member portal access
        };
        memberError = null; // Clear the error since we found the member
      }
    }

    if (memberError) {
      console.error('Member lookup error:', memberError);
      return NextResponse.json({ error: 'Failed to fetch member details' }, { status: 500 });
    }

    if (!member) {
      console.error('Member not found for ID:', id);
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get subscriptions using member_id
    const { data: subscriptions } = await supabaseServer()
      .from('subscriptions')
      .select(`
        *,
        plans (
          id,
          name,
          price
        )
      `)
      .eq('member_id', id)
      .order('created_at', { ascending: false });

    // Get class registrations using member_id
    const { data: registrations } = await supabaseServer()
      .from('class_registrations')
      .select(`
        *,
        courses (
          id,
          course_date,
          start_time,
          end_time,
          class_id,
          classes (
            id,
            name
          )
        )
      `)
      .eq('member_id', id)
      .order('registration_date', { ascending: false });

    // Get check-ins using member_id
    const { data: checkins } = await supabaseServer()
      .from('checkins')
      .select(`
        *,
        class_registrations (
          id,
          courses (
            id,
            course_date,
            start_time,
            end_time,
            classes (
              id,
              name
            )
          )
        )
      `)
      .eq('member_id', id)
      .order('checkin_time', { ascending: false });

    // Get payments using member_id
    const { data: payments } = await supabaseServer()
      .from('payments')
      .select('*')
      .eq('member_id', id)
      .order('payment_date', { ascending: false });

    // Format the response
    const memberDetails = {
      member: {
        id: member.member_id,
        account_id: member.account_id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        status: member.member_status,
        accountStatus: member.account_status,
        phone: member.phone,
        dateOfBirth: member.date_of_birth,
        address: member.address,
        profession: member.profession,
        memberNotes: member.member_notes,
        credit: member.credit,
        userType: member.user_type,
        accessiblePortals: member.accessible_portals,
        isUnlinked: member.account_id === null // Flag to indicate if member is unlinked
      },
      subscriptions: subscriptions?.map(sub => ({
        id: sub.id,
        member_id: sub.member_id,
        plan_id: sub.plan_id,
        startDate: sub.start_date,
        endDate: sub.end_date,
        status: sub.status,
        plan: sub.plans ? {
          id: sub.plans.id,
          name: sub.plans.name,
          price: sub.plans.price
        } : null
      })) || [],
      registrations: registrations?.map(reg => ({
        id: reg.id,
        course_id: reg.course_id,
        member_id: reg.member_id,
        status: reg.status,
        registration_date: reg.registration_date,
        qr_code: reg.qr_code,
        notes: reg.notes,
        course: reg.courses ? {
          id: reg.courses.id,
          course_date: reg.courses.course_date,
          start_time: reg.courses.start_time,
          end_time: reg.courses.end_time,
          class: reg.courses.classes ? {
            id: reg.courses.classes.id,
            name: reg.courses.classes.name
          } : null
        } : null
      })) || [],
      checkins: checkins?.map(checkin => ({
        id: checkin.id,
        checkin_time: checkin.checkin_time,
        course: checkin.class_registrations?.courses ? {
          id: checkin.class_registrations.courses.id,
          course_date: checkin.class_registrations.courses.course_date,
          start_time: checkin.class_registrations.courses.start_time,
          end_time: checkin.class_registrations.courses.end_time,
          class: checkin.class_registrations.courses.classes ? {
            id: checkin.class_registrations.courses.classes.id,
            name: checkin.class_registrations.courses.classes.name
          } : null
        } : null
      })) || [],
      payments: payments?.map(payment => ({
        id: payment.id,
        subscription_id: payment.subscription_id,
        member_id: payment.member_id,
        amount: payment.amount,
        payment_type: payment.payment_type,
        payment_status: payment.payment_status,
        payment_date: payment.payment_date,
        transaction_id: payment.transaction_id,
        notes: payment.notes
      })) || []
    };

    return NextResponse.json(memberDetails);

  } catch (error) {
    console.error('Member details error:', error);
    return NextResponse.json({ error: 'Failed to fetch member details' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
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

    // Check if the user is an admin using new user system
    const { data: profile, error: profileError } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', authUser.email)
      .single();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
    }

    if (!profile || !profile.is_admin || !profile.accessible_portals?.includes('admin')) {
      console.error('Admin check failed:', { 
        isAdmin: profile?.is_admin, 
        portals: profile?.accessible_portals,
        userEmail: authUser.email 
      });
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Get the member first to find the account_id
    let { data: member, error: memberError } = await supabaseServer()
      .from('user_profiles')
      .select('account_id')
      .eq('member_id', id)
      .single();

    // If not found by member_id, try by account_id
    if (memberError && memberError.code === 'PGRST116') {
      const fallbackResult = await supabaseServer()
        .from('user_profiles')
        .select('account_id')
        .eq('account_id', id)
        .single();
      
      member = fallbackResult.data;
      memberError = fallbackResult.error;
    }

    // If still not found, try to find unlinked member directly from members table
    if (memberError && memberError.code === 'PGRST116') {
      const { data: unlinkedMember, error: unlinkedError } = await supabaseServer()
        .from('members')
        .select('account_id')
        .eq('id', id)
        .single();

      if (!unlinkedError && unlinkedMember) {
        member = unlinkedMember;
        memberError = null;
      }
    }

    if (memberError || !member) {
      console.error('Member lookup error:', memberError);
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const accountId = member.account_id;

    // Update profile data (only for linked members)
    if (accountId) {
      const profileUpdates: Record<string, unknown> = {};
      if (body.firstName !== undefined) profileUpdates.first_name = body.firstName;
      if (body.lastName !== undefined) profileUpdates.last_name = body.lastName;
      if (body.phone !== undefined) profileUpdates.phone = body.phone;
      if (body.dateOfBirth !== undefined) profileUpdates.date_of_birth = body.dateOfBirth;
      if (body.address !== undefined) profileUpdates.address = body.address;
      if (body.profession !== undefined) profileUpdates.profession = body.profession;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabaseServer()
          .from('profiles')
          .update(profileUpdates)
          .eq('id', accountId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
      }
    } else {
      // For unlinked members, update profile data directly through the members table
      const profileUpdates: Record<string, unknown> = {};
      if (body.firstName !== undefined) profileUpdates.first_name = body.firstName;
      if (body.lastName !== undefined) profileUpdates.last_name = body.lastName;
      if (body.phone !== undefined) profileUpdates.phone = body.phone;
      if (body.dateOfBirth !== undefined) profileUpdates.date_of_birth = body.dateOfBirth;
      if (body.address !== undefined) profileUpdates.address = body.address;
      if (body.profession !== undefined) profileUpdates.profession = body.profession;

      if (Object.keys(profileUpdates).length > 0) {
        // Get the profile_id from the member record
        const { data: memberData, error: memberDataError } = await supabaseServer()
          .from('members')
          .select('profile_id')
          .eq('id', id)
          .single();

        if (memberDataError || !memberData) {
          console.error('Error getting member profile_id:', memberDataError);
          return NextResponse.json({ error: 'Failed to get member profile' }, { status: 500 });
        }

        const { error: profileError } = await supabaseServer()
          .from('profiles')
          .update(profileUpdates)
          .eq('id', memberData.profile_id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
      }
    }

    // Note: Account data (email, userType, accessiblePortals, accountStatus) 
    // should be updated via the account page, not the member page

    // Update member data
    const memberUpdates: Record<string, unknown> = {};
    if (body.memberNotes !== undefined) memberUpdates.member_notes = body.memberNotes;
    if (body.status !== undefined) memberUpdates.status = body.status;
    if (body.credit !== undefined) memberUpdates.credit = body.credit;

    if (Object.keys(memberUpdates).length > 0) {
      let updateQuery;
      if (accountId) {
        // For linked members, update by account_id
        updateQuery = supabaseServer()
          .from('members')
          .update(memberUpdates)
          .eq('account_id', accountId);
      } else {
        // For unlinked members, update by member id directly
        updateQuery = supabaseServer()
          .from('members')
          .update(memberUpdates)
          .eq('id', id);
      }

      const { error: memberError } = await updateQuery;

      if (memberError) {
        console.error('Member update error:', memberError);
        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Member updated successfully' });

  } catch (error) {
    console.error('Member update error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
} 