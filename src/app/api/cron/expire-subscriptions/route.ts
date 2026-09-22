import { NextRequest, NextResponse } from 'next/server';
import { expirePastSubscriptions } from '@/lib/expire-subscriptions';

async function expireSubscriptions(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    console.log(`[EXPIRE-CRON] Expiring past-end subscriptions at ${now.toISOString()}`);

    const updatedCount = await expirePastSubscriptions();
    if (updatedCount === null) {
      return NextResponse.json({ error: 'Failed to expire subscriptions' }, { status: 500 });
    }

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
