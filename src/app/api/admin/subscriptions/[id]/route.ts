import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/subscriptions\/(.+?)(\/|$)/);
  return match ? match[1] : null;
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
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
    const { userId, planId, startDate, endDate, notes, status } = body;

    // Validate required fields
    if (!userId || !planId || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, planId, startDate, endDate' 
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
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
    }

    // Validate user exists
    const { data: user, error: userError } = await supabaseServer()
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    // Update subscription
    const updateData: any = {
      user_id: userId,
      plan_id: parseInt(planId),
      start_date: startDate,
      end_date: endDate,
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
        users:user_id (
          id,
          first_name,
          last_name,
          email
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

    // Flatten the response for frontend compatibility
    const userData = Array.isArray(updatedSubscription.users) ? updatedSubscription.users[0] : updatedSubscription.users;
    const planData = Array.isArray(updatedSubscription.plans) ? updatedSubscription.plans[0] : updatedSubscription.plans;

    const flattenedSubscription = {
      id: updatedSubscription.id,
      user_id: updatedSubscription.user_id,
      plan_id: updatedSubscription.plan_id,
      start_date: updatedSubscription.start_date,
      end_date: updatedSubscription.end_date,
      sessions_remaining: updatedSubscription.sessions_remaining,
      status: updatedSubscription.status,
      notes: updatedSubscription.notes,
      created_at: updatedSubscription.created_at,
      updated_at: updatedSubscription.updated_at,
      member: userData ? {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
      } : null,
      plan: planData ? {
        id: planData.id,
        name: planData.name,
        price: planData.price,
        sessionsIncluded: planData.plan_groups?.reduce((sum: number, group: any) => sum + (group.session_count || 0), 0) || 0,
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

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabaseServer()
      .from('users')
      .select('is_admin')
      .eq('auth_user_id', adminUser.id)
      .single();

    if (!adminCheck?.is_admin) {
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

    // Delete related payments first
    const { error: paymentsDeleteError } = await supabaseServer()
      .from('payments')
      .delete()
      .eq('subscription_id', subscriptionId);

    if (paymentsDeleteError) {
      console.error('Error deleting related payments:', paymentsDeleteError);
      return NextResponse.json({ 
        error: 'Failed to delete related payments', 
        details: paymentsDeleteError 
      }, { status: 500 });
    }

    // Delete the subscription
    const { error: deleteError } = await supabaseServer()
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (deleteError) {
      console.error('Subscription delete error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete subscription', 
        details: deleteError 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription deleted successfully' 
    });

  } catch (error) {
    console.error('Subscription delete error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
} 