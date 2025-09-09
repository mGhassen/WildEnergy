import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Verify admin
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { data: adminCheck } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('email', adminUser.email)
      .single();

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;

    // Check if plan has active subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('id, user_id, status, users (id, first_name, last_name, email)')
      .eq('plan_id', id);

    if (subscriptionError) {
      return NextResponse.json({ error: 'Failed to check plan subscriptions' }, { status: 500 });
    }

    const activeSubscriptions = subscriptions?.filter(sub => sub.status === 'active') || [];
    const canDelete = activeSubscriptions.length === 0;

    return NextResponse.json({
      canDelete,
      linkedSubscriptions: activeSubscriptions,
      message: canDelete 
        ? 'Plan can be deleted safely'
        : `This plan has ${activeSubscriptions.length} active subscription(s)`
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
