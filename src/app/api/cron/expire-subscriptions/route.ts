import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function expireSubscriptions(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    console.log(`[EXPIRE-CRON] Expiring past-end subscriptions at ${now.toISOString()}`);

    const { data, error } = await supabaseServer().rpc('expire_past_subscriptions');

    if (error) {
      console.error('[EXPIRE-CRON] Error calling expire_past_subscriptions:', error);
      return NextResponse.json({ error: 'Failed to expire subscriptions' }, { status: 500 });
    }

    const updatedCount = typeof data === 'number' ? data : 0;
    console.log(`[EXPIRE-CRON] Marked ${updatedCount} subscription(s) as expired.`);

    return NextResponse.json({
      success: true,
      message: `Marked ${updatedCount} subscription(s) as expired`,
      updatedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[EXPIRE-CRON] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return expireSubscriptions(req);
}

export async function GET(req: NextRequest) {
  return expireSubscriptions(req);
}
