import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { mapMemberStatusToAccountStatus } from '@/lib/status-mapping';

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
      if (body.phone !== undefined) {
        // Convert empty string to null for optional fields
        profileUpdates.phone = body.phone === "" ? null : body.phone;
      }
      if (body.profileEmail !== undefined) {
        profileUpdates.profile_email = body.profileEmail === "" ? null : body.profileEmail;
      }
      if (body.dateOfBirth !== undefined) {
        profileUpdates.date_of_birth = body.dateOfBirth === "" ? null : body.dateOfBirth;
      }
      if (body.address !== undefined) {
        profileUpdates.address = body.address === "" ? null : body.address;
      }
      if (body.profession !== undefined) {
        profileUpdates.profession = body.profession === "" ? null : body.profession;
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabaseServer()
          .from('profiles')
          .update(profileUpdates)
          .eq('id', accountId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          console.error('Profile update data:', profileUpdates);
          console.error('Account ID:', accountId);
          return NextResponse.json({ 
            error: 'Failed to update profile', 
            details: profileError.message 
          }, { status: 500 });
        }
      }
    } else {
      // For unlinked members, update profile data directly through the members table
      const profileUpdates: Record<string, unknown> = {};
      if (body.firstName !== undefined) profileUpdates.first_name = body.firstName;
      if (body.lastName !== undefined) profileUpdates.last_name = body.lastName;
      if (body.phone !== undefined) {
        // Convert empty string to null for optional fields
        profileUpdates.phone = body.phone === "" ? null : body.phone;
      }
      if (body.profileEmail !== undefined) {
        profileUpdates.profile_email = body.profileEmail === "" ? null : body.profileEmail;
      }
      if (body.dateOfBirth !== undefined) {
        profileUpdates.date_of_birth = body.dateOfBirth === "" ? null : body.dateOfBirth;
      }
      if (body.address !== undefined) {
        profileUpdates.address = body.address === "" ? null : body.address;
      }
      if (body.profession !== undefined) {
        profileUpdates.profession = body.profession === "" ? null : body.profession;
      }

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
          console.error('Profile update data:', profileUpdates);
          console.error('Profile ID:', memberData.profile_id);
          return NextResponse.json({ 
            error: 'Failed to update profile', 
            details: profileError.message 
          }, { status: 500 });
        }
      }
    }

    // Note: Account data (email, userType, accessiblePortals, accountStatus) 
    // should be updated via the account page, not the member page

    // Update member data
    const memberUpdates: Record<string, unknown> = {};
    if (body.memberNotes !== undefined) {
      // Convert empty string to null for optional fields
      memberUpdates.member_notes = body.memberNotes === "" ? null : body.memberNotes;
    }
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

      // Sync account status if member status was updated and member has an account
      if (body.status !== undefined && accountId) {
        const accountStatus = mapMemberStatusToAccountStatus(body.status);
        const { error: accountStatusError } = await supabaseServer()
          .from('accounts')
          .update({ status: accountStatus })
          .eq('id', accountId);

        if (accountStatusError) {
          console.error('Failed to sync account status with member status:', accountStatusError);
          // Don't fail the request, just log the error
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Member updated successfully' });

  } catch (error) {
    console.error('Member update error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Get the member first to find the account_id and check for dependencies
    let { data: member, error: memberError } = await supabaseServer()
      .from('user_profiles')
      .select('account_id, member_id')
      .eq('member_id', id)
      .single();

    // If not found by member_id, try by account_id
    if (memberError && memberError.code === 'PGRST116') {
      const fallbackResult = await supabaseServer()
        .from('user_profiles')
        .select('account_id, member_id')
        .eq('account_id', id)
        .single();
      
      member = fallbackResult.data;
      memberError = fallbackResult.error;
    }

    // If still not found, try to find unlinked member directly from members table
    if (memberError && memberError.code === 'PGRST116') {
      const { data: unlinkedMember, error: unlinkedError } = await supabaseServer()
        .from('members')
        .select('account_id, id')
        .eq('id', id)
        .single();

      if (!unlinkedError && unlinkedMember) {
        member = {
          account_id: unlinkedMember.account_id,
          member_id: unlinkedMember.id
        };
        memberError = null;
      }
    }

    if (memberError || !member) {
      console.error('Member lookup error:', memberError);
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const accountId = member.account_id;
    const memberId = member.member_id;

    // Check for dependencies before deletion
    const { data: registrations } = await supabaseServer()
      .from('class_registrations')
      .select('id')
      .eq('member_id', memberId)
      .limit(1);

    const { data: subscriptions } = await supabaseServer()
      .from('subscriptions')
      .select('id')
      .eq('member_id', memberId)
      .limit(1);

    const { data: payments } = await supabaseServer()
      .from('payments')
      .select('id')
      .eq('member_id', memberId)
      .limit(1);

    const { data: checkins } = await supabaseServer()
      .from('checkins')
      .select('id')
      .eq('member_id', memberId)
      .limit(1);

    // Check if member has any dependencies
    if (registrations && registrations.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete member with existing registrations',
        message: 'This member has class registrations. Please cancel all registrations first.',
        details: {
          registrationsCount: registrations.length,
          subscriptionsCount: subscriptions?.length || 0,
          paymentsCount: payments?.length || 0,
          checkinsCount: checkins?.length || 0
        }
      }, { status: 400 });
    }

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete member with existing subscriptions',
        message: 'This member has active subscriptions. Please cancel all subscriptions first.',
        details: {
          registrationsCount: registrations?.length || 0,
          subscriptionsCount: subscriptions.length,
          paymentsCount: payments?.length || 0,
          checkinsCount: checkins?.length || 0
        }
      }, { status: 400 });
    }

    if (payments && payments.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete member with existing payments',
        message: 'This member has payment records. Please contact support to handle payment data.',
        details: {
          registrationsCount: registrations?.length || 0,
          subscriptionsCount: subscriptions?.length || 0,
          paymentsCount: payments.length,
          checkinsCount: checkins?.length || 0
        }
      }, { status: 400 });
    }

    // If member is linked to an account, delete the auth user (this will cascade)
    if (accountId) {
      // Get the auth_user_id from the accounts table
      const { data: account, error: accountError } = await supabaseServer()
        .from('accounts')
        .select('auth_user_id')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      if (account.auth_user_id) {
        // Delete from Supabase Auth (this will cascade to account, which will cascade to member)
        const { error: deleteAuthError } = await supabaseServer().auth.admin.deleteUser(account.auth_user_id);
        if (deleteAuthError) {
          console.error('Auth delete error:', deleteAuthError);
          return NextResponse.json({ 
            error: 'Failed to delete member from authentication', 
            details: deleteAuthError.message 
          }, { status: 500 });
        }
      } else {
        // Account exists but has no auth user, just delete the account directly
        const { error: deleteAccountError } = await supabaseServer()
          .from('accounts')
          .delete()
          .eq('id', accountId);

        if (deleteAccountError) {
          console.error('Account delete error:', deleteAccountError);
          return NextResponse.json({ 
            error: 'Failed to delete account', 
            details: deleteAccountError.message 
          }, { status: 500 });
        }
      }
    } else {
      // For unlinked members, delete directly from members table
      // First get the profile_id to delete the profile as well
      const { data: memberData, error: memberDataError } = await supabaseServer()
        .from('members')
        .select('profile_id')
        .eq('id', memberId)
        .single();

      if (memberDataError || !memberData) {
        console.error('Error getting member profile_id:', memberDataError);
        return NextResponse.json({ error: 'Failed to get member profile' }, { status: 500 });
      }

      // Delete the member record
      const { error: deleteMemberError } = await supabaseServer()
        .from('members')
        .delete()
        .eq('id', memberId);

      if (deleteMemberError) {
        console.error('Member delete error:', deleteMemberError);
        return NextResponse.json({ 
          error: 'Failed to delete member', 
          details: deleteMemberError.message 
        }, { status: 500 });
      }

      // Delete the profile record
      const { error: deleteProfileError } = await supabaseServer()
        .from('profiles')
        .delete()
        .eq('id', memberData.profile_id);

      if (deleteProfileError) {
        console.error('Profile delete error:', deleteProfileError);
        // Don't fail the request since member is already deleted
        console.warn('Member deleted but profile deletion failed:', deleteProfileError.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Member deleted successfully',
      memberId: memberId,
      wasLinked: !!accountId
    });

  } catch (error) {
    console.error('Member delete error:', error);
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
} 