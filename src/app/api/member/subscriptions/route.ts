import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id, is_admin')
    .eq('account_id', user.id)
    .single();
  return userProfile;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    if (!userProfile.member_id) {
      return NextResponse.json({ error: 'User is not a member' }, { status: 403 });
    }
    const { data: subscriptions, error } = await supabaseServer()
      .from('subscriptions')
      .select(`
        *,
        plan:plans(
          *,
          plan_groups (
            id,
            group_id,
            session_count,
            is_free,
            groups (
              id,
              name,
              description,
              color,
              category_groups (
                categories (
                  id,
                  name,
                  description,
                  color
                )
              )
            )
          )
        ),
        subscription_group_sessions(
          id,
          group_id,
          sessions_remaining,
          total_sessions,
          groups(
            id,
            name,
            description,
            color
          )
        )
      `)
      .eq('member_id', userProfile.member_id);
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }
    return NextResponse.json(subscriptions);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    
    const userProfile = await getUserFromToken(token);
    if (!userProfile) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Only admins can manually refund sessions
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { subscriptionId, sessionsToRefund = 1 } = await req.json();
    
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    // Get the subscription
    const { data: subscription, error: subError } = await supabaseServer()
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Update sessions_remaining
    const { data: updatedSubscription, error: updateError } = await supabaseServer()
      .from('subscriptions')
      .update({ 
        sessions_remaining: subscription.sessions_remaining + sessionsToRefund,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    console.log(`Manually refunded ${sessionsToRefund} session(s) to subscription ${subscriptionId}`);
    
    return NextResponse.json({ 
      success: true, 
      subscription: updatedSubscription,
      sessionsRefunded: sessionsToRefund,
      newSessionsRemaining: updatedSubscription.sessions_remaining
    });

  } catch (error) {
    console.error('POST manual refund error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 