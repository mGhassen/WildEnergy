import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('member_id, is_admin')
    .eq('email', user.email)
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

    const { subscriptionId, sessionsToRefund = 1, groupId } = await req.json();
    
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    if (sessionsToRefund <= 0) {
      return NextResponse.json({ error: 'Sessions to refund must be greater than 0' }, { status: 400 });
    }

    if (sessionsToRefund > 100) {
      return NextResponse.json({ error: 'Cannot refund more than 100 sessions at once' }, { status: 400 });
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

    // Get group sessions for this subscription
    let query = supabaseServer()
      .from('subscription_group_sessions')
      .select('*')
      .eq('subscription_id', subscriptionId);

    // If groupId is specified, filter by that group
    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    const { data: groupSessions, error: groupSessionsError } = await query;

    if (groupSessionsError) {
      console.error('Error fetching group sessions:', groupSessionsError);
      return NextResponse.json({ error: 'Failed to fetch subscription group sessions' }, { status: 500 });
    }

    if (!groupSessions || groupSessions.length === 0) {
      const errorMsg = groupId 
        ? `No group sessions found for group ${groupId} in this subscription`
        : 'No group sessions found for this subscription';
      return NextResponse.json({ error: errorMsg }, { status: 404 });
    }

    // Refund sessions to the specified group(s)
    let sessionsRefunded = 0;
    
    if (groupId) {
      // Refund to specific group
      const groupSession = groupSessions[0];
      const sessionsToRefundThisGroup = Math.min(
        sessionsToRefund,
        groupSession.total_sessions - groupSession.sessions_remaining
      );
      
      if (sessionsToRefundThisGroup > 0) {
        const { error: updateError } = await supabaseServer()
          .from('subscription_group_sessions')
          .update({ 
            sessions_remaining: groupSession.sessions_remaining + sessionsToRefundThisGroup,
            updated_at: new Date().toISOString()
          })
          .eq('id', groupSession.id);

        if (updateError) {
          console.error('Error updating group session:', updateError);
          return NextResponse.json({ error: 'Failed to update group session' }, { status: 500 });
        }
        
        sessionsRefunded = sessionsToRefundThisGroup;
      }
    } else {
      // Refund to all groups (distribute evenly)
      const sessionsToRefundPerGroup = Math.ceil(sessionsToRefund / groupSessions.length);
      
      for (const groupSession of groupSessions) {
        if (sessionsRefunded >= sessionsToRefund) break;
        
        const sessionsToRefundThisGroup = Math.min(
          sessionsToRefundPerGroup,
          sessionsToRefund - sessionsRefunded,
          groupSession.total_sessions - groupSession.sessions_remaining
        );
        
        if (sessionsToRefundThisGroup > 0) {
          const { error: updateError } = await supabaseServer()
            .from('subscription_group_sessions')
            .update({ 
              sessions_remaining: groupSession.sessions_remaining + sessionsToRefundThisGroup,
              updated_at: new Date().toISOString()
            })
            .eq('id', groupSession.id);

          if (updateError) {
            console.error('Error updating group session:', updateError);
            return NextResponse.json({ error: 'Failed to update group session' }, { status: 500 });
          }
          
          sessionsRefunded += sessionsToRefundThisGroup;
        }
      }
    }

    // Update subscription timestamp
    const { data: updatedSubscription, error: updateError } = await supabaseServer()
      .from('subscriptions')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    if (sessionsRefunded === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No sessions could be refunded. All group sessions may already be at maximum capacity.',
        sessionsRefunded: 0
      }, { status: 400 });
    }

    console.log(`Manually refunded ${sessionsRefunded} session(s) to subscription ${subscriptionId}`);
    
    return NextResponse.json({ 
      success: true, 
      subscription: updatedSubscription,
      sessionsRefunded: sessionsRefunded,
      message: `Successfully refunded ${sessionsRefunded} session(s) to subscription group sessions`
    });

  } catch (error) {
    console.error('POST manual refund error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 