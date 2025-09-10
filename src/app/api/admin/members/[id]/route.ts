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
    // First try to find by member_id, then by account_id as fallback
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
        subscriptionStatus: member.subscription_status,
        phone: member.phone,
        dateOfBirth: member.date_of_birth,
        address: member.address,
        profession: member.profession,
        memberNotes: member.member_notes,
        credit: member.credit,
        userType: member.user_type,
        accessiblePortals: member.accessible_portals
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