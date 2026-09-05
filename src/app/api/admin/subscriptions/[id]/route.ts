import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { getMemberCreditBalance } from '@/lib/member-credit';
import { deleteSubscriptionWithDependents } from '@/lib/subscription-delete-cleanup';
import {
  ensureSubscriptionGroupSessions,
  resetSubscriptionGroupSessionsForPlan,
} from '@/lib/subscription-group-sessions';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/subscriptions\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

const SUBSCRIPTION_DETAIL_SELECT = `
  *,
  members:member_id(
    id,
    status,
    profiles:profile_id(
      first_name,
      last_name
    ),
    accounts:account_id(
      email
    )
  ),
  plan:plans(
    id,
    name,
    price,
    duration_days,
    is_active,
    is_free,
    plan_groups(
      id,
      group_id,
      session_count,
      is_free,
      group:groups(
        id,
        name,
        description,
        color
      )
    ),
    plan_session_pools(
      id,
      session_count,
      is_free,
      plan_session_pool_groups(
        id,
        group_id,
        groups(
          id,
          name,
          description,
          color
        )
      )
    )
  ),
  subscription_group_sessions(
    id,
    group_id,
    sessions_remaining,
    total_sessions,
    group:groups(
      id,
      name,
      description,
      color
    )
  ),
  subscription_pool_sessions(
    id,
    pool_id,
    sessions_remaining,
    total_sessions,
    plan_session_pools(
      id,
      session_count,
      is_free,
      plan_session_pool_groups(
        group_id,
        groups(
          id,
          name,
          description,
          color
        )
      )
    )
  )
`;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

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

    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }
    const subscriptionId = parseInt(id, 10);
    if (!Number.isFinite(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    const { data: sub, error } = await supabaseServer()
      .from('subscriptions')
      .select(SUBSCRIPTION_DETAIL_SELECT)
      .eq('id', subscriptionId)
      .single();

    if (error || !sub) {
      return NextResponse.json(
        { error: 'Subscription not found', details: error?.message },
        { status: 404 },
      );
    }

    const memberRow = Array.isArray(sub.members) ? sub.members[0] : sub.members;
    const { members: _members, ...rest } = sub;
    const plan = rest.plan
      ? {
          ...rest.plan,
          price: parseFloat(rest.plan.price) || 0,
        }
      : null;

    const memberCredit = memberRow?.id
      ? await getMemberCreditBalance(memberRow.id)
      : 0;

    const { data: registrations, error: regError } = await supabaseServer()
      .from('class_registrations')
      .select(`
        id,
        status,
        registration_date,
        notes,
        qr_code,
        subscription_id,
        session_source,
        group_id,
        pool_id,
        course:courses(
          id,
          course_date,
          start_time,
          end_time,
          class:classes(id, name)
        ),
        checkins(id, checkin_time),
        group:groups!class_registrations_group_id_fkey(id, name, color),
        pool:plan_session_pools!class_registrations_pool_id_fkey(
          id,
          plan_session_pool_groups(
            group_id,
            groups(id, name, color)
          )
        )
      `)
      .eq('subscription_id', subscriptionId)
      .order('registration_date', { ascending: false });

    if (regError) {
      console.error('Subscription registrations fetch error:', regError);
    }

    return NextResponse.json({
      ...rest,
      plan,
      registrations: registrations || [],
      member: memberRow
        ? {
            member_id: memberRow.id,
            id: memberRow.id,
            first_name: memberRow.profiles?.first_name || '',
            last_name: memberRow.profiles?.last_name || '',
            firstName: memberRow.profiles?.first_name || '',
            lastName: memberRow.profiles?.last_name || '',
            account_email: memberRow.accounts?.email || '',
            email: memberRow.accounts?.email || '',
            member_status: memberRow.status || 'active',
            credit: memberCredit,
          }
        : null,
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const subscriptionId = parseInt(id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    const body = await request.json();
    const { member_id, plan_id, start_date, end_date, notes, status } = body;

    // Validate required fields
    if (!member_id || !plan_id || !start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: member_id, plan_id, start_date, end_date' 
      }, { status: 400 });
    }

    // Check if subscription exists
    const { data: existingSubscription, error: fetchError } = await supabaseServer()
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !existingSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabaseServer()
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    // Validate member exists
    const { data: member, error: memberError } = await supabaseServer()
      .from('members')
      .select('*')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 400 });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start_date or end_date' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
    }

    // Update subscription
    const updateData: any = {
      member_id: member_id,
      plan_id: parseInt(plan_id),
      start_date: start_date,
      end_date: end_date,
      // sessions_remaining removed - now handled by subscription_group_sessions
      updated_at: new Date().toISOString(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    const { data: updatedSubscription, error: updateError } = await supabaseServer()
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select(`
        *,
        members:member_id (
          id,
          account_id,
          profiles:profile_id (
            first_name,
            last_name
          ),
          accounts:account_id (
            email
          )
        ),
        plans:plan_id (
          id,
          name,
          price,
          duration_days
        )
      `)
      .single();

    if (updateError) {
      console.error('Subscription update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update subscription', 
        details: updateError 
      }, { status: 500 });
    }

    const planChanged = existingSubscription.plan_id !== parseInt(plan_id, 10);
    const { error: groupSessionsError } = planChanged
      ? await resetSubscriptionGroupSessionsForPlan(supabaseServer(), subscriptionId)
      : await ensureSubscriptionGroupSessions(supabaseServer(), subscriptionId);

    if (groupSessionsError) {
      console.error('Error ensuring subscription group sessions:', groupSessionsError);
    }

    // Flatten the response for frontend compatibility
    const memberData = Array.isArray(updatedSubscription.members) ? updatedSubscription.members[0] : updatedSubscription.members;
    const planData = Array.isArray(updatedSubscription.plans) ? updatedSubscription.plans[0] : updatedSubscription.plans;

    const flattenedSubscription = {
      id: updatedSubscription.id,
      member_id: updatedSubscription.member_id,
      plan_id: updatedSubscription.plan_id,
      start_date: updatedSubscription.start_date,
      end_date: updatedSubscription.end_date,
      status: updatedSubscription.status,
      notes: updatedSubscription.notes,
      created_at: updatedSubscription.created_at,
      updated_at: updatedSubscription.updated_at,
      member: memberData ? {
        id: memberData.id,
        firstName: memberData.profiles?.first_name || '',
        lastName: memberData.profiles?.last_name || '',
        email: memberData.accounts?.email || '',
      } : null,
      plan: planData ? {
        id: planData.id,
        name: planData.name,
        price: planData.price,
        sessionsIncluded: (planData.plan_groups?.reduce((sum: number, group: any) => sum + (group.session_count || 0), 0) || 0)
          + (planData.plan_session_pools?.reduce((sum: number, pool: any) => sum + (pool.session_count || 0), 0) || 0),
        duration: planData.duration_days,
      } : null,
    };

    return NextResponse.json({ 
      success: true, 
      subscription: flattenedSubscription 
    });

  } catch (error) {
    console.error('Subscription update error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const id = extractIdFromUrl(request);
    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const subscriptionId = parseInt(id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    // Check if subscription exists
    const { data: existingSubscription, error: fetchError } = await supabaseServer()
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !existingSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const result = await deleteSubscriptionWithDependents(
      supabaseServer(),
      subscriptionId
    );
    if (!result.ok) {
      console.error('Subscription delete error:', result.error, result.details);
      return NextResponse.json(
        {
          error: result.error,
          details: result.details,
          paymentCount: result.paymentCount,
          payments: result.payments,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription deleted successfully',
    });

  } catch (error) {
    console.error('Subscription delete error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
} 