import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const subscriptionId = parseInt(resolvedParams.id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 400 });
    }

    const body = await request.json();
    const { group_id } = body;

    if (!group_id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Check if subscription exists and is active
    const { data: subscription, error: subscriptionError } = await supabaseServer()
      .from('subscriptions')
      .select('id, status, member_id')
      .eq('id', subscriptionId)
      .single();

    if (subscriptionError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    if (subscription.status !== 'active') {
      return NextResponse.json({ error: 'Subscription is not active' }, { status: 400 });
    }

    // Check if group session exists and has remaining sessions
    const { data: groupSession, error: groupSessionError } = await supabaseServer()
      .from('subscription_group_sessions')
      .select('id, sessions_remaining, group_id')
      .eq('subscription_id', subscriptionId)
      .eq('group_id', group_id)
      .single();

    if (groupSessionError || !groupSession) {
      return NextResponse.json({ error: 'Group session not found for this subscription' }, { status: 404 });
    }

    if (groupSession.sessions_remaining <= 0) {
      return NextResponse.json({ error: 'No sessions remaining for this group' }, { status: 400 });
    }

    // Consume one session
    const { data: updatedGroupSession, error: updateError } = await supabaseServer()
      .from('subscription_group_sessions')
      .update({ 
        sessions_remaining: groupSession.sessions_remaining - 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupSession.id)
      .select('sessions_remaining, group:groups(id, name, color)')
      .single();

    if (updateError) {
      console.error('Error consuming session:', updateError);
      return NextResponse.json({ error: 'Failed to consume session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Session consumed successfully',
      group_session: updatedGroupSession
    });

  } catch (error) {
    console.error('Consume session error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error) 
    }, { status: 500 });
  }
}
