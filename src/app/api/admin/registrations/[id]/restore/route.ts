import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: userProfile } = await supabaseServer()
    .from('user_profiles')
    .select('*')
    .eq('email', user.email)
    .single();
  return userProfile;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    if (!userProfile.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const registrationId = parseInt(id);

    if (!registrationId || isNaN(registrationId)) {
      return NextResponse.json({ error: 'Invalid registration ID' }, { status: 400 });
    }

    let consumeSession = true;
    let subscriptionId: number | undefined = undefined;
    try {
      const body = await req.json();
      if (typeof body.consumeSession === 'boolean') {
        consumeSession = body.consumeSession;
      }
      if (typeof body.subscriptionId === 'number' && Number.isFinite(body.subscriptionId)) {
        subscriptionId = body.subscriptionId;
      }
    } catch {}

    if (consumeSession && !subscriptionId) {
      return NextResponse.json(
        { error: 'Select a subscription to consume the session' },
        { status: 400 }
      );
    }

    const { data: result, error: procedureError } = await supabaseServer().rpc(
      'restore_cancelled_registration',
      {
        p_registration_id: registrationId,
        p_subscription_id: subscriptionId ?? null,
        p_consume_session: consumeSession,
      }
    );

    if (procedureError) {
      console.error('Restore procedure error:', procedureError);
      return NextResponse.json(
        { error: procedureError.message || 'Failed to restore registration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionConsumed: result?.session_consumed,
      subscriptionId: result?.subscription_id,
      message: result?.session_consumed
        ? 'Registration restored. Session consumed from the selected subscription.'
        : 'Registration restored without consuming a session.',
    });
  } catch (error) {
    console.error('POST restore registration error:', error);
    return NextResponse.json({ error: 'Failed to restore registration' }, { status: 500 });
  }
}
