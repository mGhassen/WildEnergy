import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/members\/([^/]+)\/details/);
  return match ? match[1] : null;
}

export async function GET(request: NextRequest) {
  try {
    const id = extractIdFromUrl(request);
    
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

    // Check if the user is an admin
    const { data: profile } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', authUser.id)
      .single();

    if (!profile || !profile.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get member details
    const { data: member, error: memberError } = await supabaseServer()
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get subscriptions
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
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    // Get class registrations
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
      .eq('user_id', id)
      .order('registration_date', { ascending: false });

    // Get check-ins
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
      .eq('user_id', id)
      .order('checkin_time', { ascending: false });

    // Get payments
    const { data: payments } = await supabaseServer()
      .from('payments')
      .select('*')
      .eq('user_id', id)
      .order('payment_date', { ascending: false });

    // Format the response
    const memberDetails = {
      member: {
        id: member.id,
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        status: member.status,
        subscriptionStatus: member.subscription_status,
        phone: member.phone,
        dateOfBirth: member.date_of_birth,
        createdAt: member.created_at,
        credit: member.credit
      },
      subscriptions: subscriptions?.map(sub => ({
        id: sub.id,
        user_id: sub.user_id,
        plan_id: sub.plan_id,
        startDate: sub.start_date,
        endDate: sub.end_date,
        sessionsRemaining: sub.sessions_remaining,
        status: sub.status,
        plan: sub.plans ? {
          id: sub.plans.id,
          name: sub.plans.name,
          price: sub.plans.price,
          sessionsIncluded: sub.plans.plan_groups?.reduce((sum: number, group: any) => sum + (group.session_count || 0), 0) || 0
        } : null
      })) || [],
      registrations: registrations?.map(reg => ({
        id: reg.id,
        course_id: reg.course_id,
        user_id: reg.user_id,
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
        user_id: payment.user_id,
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