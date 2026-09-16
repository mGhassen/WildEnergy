import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function requireAdmin(token: string) {
  const { data: { user }, error } = await supabaseServer().auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', user.email)
    .single();
  if (!profile?.is_admin || !profile?.accessible_portals?.includes('admin')) return null;
  return profile;
}

function extractIds(request: NextRequest): { subscriptionId: number; inviteId: number } | null {
  const match = request.nextUrl.pathname.match(/\/subscriptions\/(\d+)\/invites\/(\d+)/);
  if (!match) return null;
  const subscriptionId = parseInt(match[1], 10);
  const inviteId = parseInt(match[2], 10);
  if (!Number.isFinite(subscriptionId) || !Number.isFinite(inviteId)) return null;
  return { subscriptionId, inviteId };
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    const admin = await requireAdmin(token);
    if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const ids = extractIds(request);
    if (!ids) return NextResponse.json({ error: 'Invalid ids' }, { status: 400 });

    const { data: invite } = await supabaseServer()
      .from('subscription_invites')
      .select('id, status')
      .eq('id', ids.inviteId)
      .eq('subscription_id', ids.subscriptionId)
      .maybeSingle();

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invites can be revoked' }, { status: 400 });
    }

    const { error } = await supabaseServer()
      .from('subscription_invites')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', ids.inviteId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
