import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    console.log(`[AUTO-CRON] Checking for finished courses at ${currentDate} ${currentTime}`);

    // Use the database function to mark absent registrations
    const { data, error } = await supabaseServer().rpc('check_finished_courses');

    if (error) {
      console.error('[AUTO-CRON] Error calling check_finished_courses:', error);
      return NextResponse.json({ error: 'Failed to process registrations' }, { status: 500 });
    }

    // Get count of registrations that were marked as absent
    const { count } = await supabaseServer()
      .from('class_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'absent')
      .gte('updated_at', now.toISOString());

    console.log(`[AUTO-CRON] Successfully processed registrations. Marked ${count || 0} as absent.`);

    return NextResponse.json({
      success: true,
      message: `Automatically marked ${count || 0} registrations as absent`,
      updatedCount: count || 0,
      timestamp: now.toISOString(),
      processed: true
    });

  } catch (error) {
    console.error('[AUTO-CRON] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also support GET for easier testing
export async function GET(req: NextRequest) {
  return POST(req);
} 