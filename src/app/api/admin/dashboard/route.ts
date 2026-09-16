import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { toDateKey } from '@/lib/date';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

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

    const today = toDateKey(new Date())!;
    const monthStart = `${today.slice(0, 7)}-01`;
    const dayStartIso = `${today}T00:00:00.000Z`;
    const dayEndIso = `${today}T23:59:59.999Z`;

    const [
      { count: totalUsers },
      { count: totalMembers },
      { count: totalTrainers },
      { count: totalClasses },
      { count: totalCheckins },
      { count: activeSubscriptions },
      { count: pendingSubscriptions },
      { count: checkinsToday },
      { count: coursesToday },
      { data: paidPayments },
      { data: monthPayments },
      { data: todayCourses },
    ] = await Promise.all([
      supabaseServer().from('accounts').select('*', { count: 'exact', head: true }),
      supabaseServer().from('members').select('*', { count: 'exact', head: true }),
      supabaseServer().from('trainers').select('*', { count: 'exact', head: true }),
      supabaseServer().from('classes').select('*', { count: 'exact', head: true }),
      supabaseServer().from('checkins').select('*', { count: 'exact', head: true }),
      supabaseServer()
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', today),
      supabaseServer()
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabaseServer()
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('checkin_time', dayStartIso)
        .lte('checkin_time', dayEndIso),
      supabaseServer()
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('course_date', today)
        .neq('status', 'cancelled'),
      supabaseServer()
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid'),
      supabaseServer()
        .from('payments')
        .select('amount, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', `${monthStart}T00:00:00.000Z`),
      supabaseServer()
        .from('courses')
        .select('max_participants, current_participants')
        .eq('course_date', today)
        .neq('status', 'cancelled'),
    ]);

    const totalRevenue = (paidPayments || []).reduce(
      (sum: number, p: { amount?: number | string }) => sum + (Number(p.amount) || 0),
      0,
    );
    const revenueThisMonth = (monthPayments || []).reduce(
      (sum: number, p: { amount?: number | string }) => sum + (Number(p.amount) || 0),
      0,
    );

    const seats = (todayCourses || []).reduce(
      (acc, c) => {
        acc.capacity += c.max_participants || 0;
        acc.booked += c.current_participants || 0;
        return acc;
      },
      { capacity: 0, booked: 0 },
    );
    const occupancyToday =
      seats.capacity > 0 ? Math.round((seats.booked / seats.capacity) * 100) : 0;

    return NextResponse.json({
      totalUsers: totalUsers ?? 0,
      totalMembers: totalMembers ?? 0,
      totalTrainers: totalTrainers ?? 0,
      totalClasses: totalClasses ?? 0,
      totalCheckins: totalCheckins ?? 0,
      totalPayments: paidPayments?.length ?? 0,
      totalRevenue,
      activeSubscriptions: activeSubscriptions ?? 0,
      pendingSubscriptions: pendingSubscriptions ?? 0,
      checkinsToday: checkinsToday ?? 0,
      coursesToday: coursesToday ?? 0,
      revenueThisMonth,
      paymentsThisMonth: monthPayments?.length ?? 0,
      occupancyToday,
      bookedSeatsToday: seats.booked,
      capacitySeatsToday: seats.capacity,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
