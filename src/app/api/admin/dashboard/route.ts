import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { toDateKey } from '@/lib/date';

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthBounds(today: string) {
  const [y, m] = today.split('-').map(Number);
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const prevMonthStart = prevMonthDate.toISOString().slice(0, 10);
  const prevMonthEnd = addDays(monthStart, -1);
  return { monthStart, prevMonthStart, prevMonthEnd };
}

function sumAmounts(rows: { amount?: number | string }[] | null | undefined) {
  return (rows || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

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
    const weekEnd = addDays(today, 6);
    const attendanceStart = addDays(today, -6);
    const prevAttendanceStart = addDays(today, -13);
    const prevAttendanceEnd = addDays(today, -7);
    const expireUntil = addDays(today, 7);
    const { monthStart, prevMonthStart, prevMonthEnd } = monthBounds(today);

    const [
      { count: activeSubscriptions },
      { count: pendingSubscriptions },
      { count: expiringSoon },
      { count: newMembersThisMonth },
      { data: monthPayments },
      { data: prevMonthPayments },
      { data: weekCourses },
      { count: checkinsThisWeek },
      { count: checkinsPrevWeek },
      { data: expiringRows },
    ] = await Promise.all([
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
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', expireUntil),
      supabaseServer()
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${monthStart}T00:00:00.000Z`),
      supabaseServer()
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('created_at', `${monthStart}T00:00:00.000Z`),
      supabaseServer()
        .from('payments')
        .select('amount')
        .eq('payment_status', 'paid')
        .gte('created_at', `${prevMonthStart}T00:00:00.000Z`)
        .lte('created_at', `${prevMonthEnd}T23:59:59.999Z`),
      supabaseServer()
        .from('courses')
        .select('course_date, max_participants, current_participants, status')
        .gte('course_date', today)
        .lte('course_date', weekEnd)
        .neq('status', 'cancelled'),
      supabaseServer()
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('checkin_time', `${attendanceStart}T00:00:00.000Z`)
        .lte('checkin_time', `${today}T23:59:59.999Z`),
      supabaseServer()
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('checkin_time', `${prevAttendanceStart}T00:00:00.000Z`)
        .lte('checkin_time', `${prevAttendanceEnd}T23:59:59.999Z`),
      supabaseServer()
        .from('subscriptions')
        .select(`
          id,
          end_date,
          members:member_id(
            id,
            profiles:profile_id(first_name, last_name)
          ),
          plan:plans(name)
        `)
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', expireUntil)
        .order('end_date', { ascending: true })
        .limit(6),
    ]);

    const revenueThisMonth = sumAmounts(monthPayments);
    const revenuePrevMonth = sumAmounts(prevMonthPayments);
    const revenueDeltaPct =
      revenuePrevMonth > 0
        ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
        : revenueThisMonth > 0
          ? 100
          : 0;

    const byDay: Record<string, { booked: number; capacity: number; courses: number }> = {};
    for (let i = 0; i < 7; i++) {
      byDay[addDays(today, i)] = { booked: 0, capacity: 0, courses: 0 };
    }
    for (const c of weekCourses || []) {
      const key = c.course_date;
      if (!byDay[key]) continue;
      byDay[key].courses += 1;
      byDay[key].booked += c.current_participants || 0;
      byDay[key].capacity += c.max_participants || 0;
    }

    const weekBooked = Object.values(byDay).reduce((s, d) => s + d.booked, 0);
    const weekCapacity = Object.values(byDay).reduce((s, d) => s + d.capacity, 0);
    const weekOccupancyPct =
      weekCapacity > 0 ? Math.round((weekBooked / weekCapacity) * 100) : 0;

    const checkinsThis = checkinsThisWeek ?? 0;
    const checkinsPrev = checkinsPrevWeek ?? 0;
    const checkinsDeltaPct =
      checkinsPrev > 0
        ? Math.round(((checkinsThis - checkinsPrev) / checkinsPrev) * 100)
        : checkinsThis > 0
          ? 100
          : 0;

    const expiring = (expiringRows || []).map((row: any) => {
      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      const profiles = member?.profiles;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
      return {
        id: row.id,
        endDate: row.end_date,
        planName: plan?.name || 'Plan',
        memberName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Member',
        memberId: member?.id || null,
      };
    });

    return NextResponse.json({
      asOf: today,
      cash: {
        revenueThisMonth,
        revenuePrevMonth,
        revenueDeltaPct,
        paymentsThisMonth: monthPayments?.length ?? 0,
      },
      membership: {
        active: activeSubscriptions ?? 0,
        pendingPayment: pendingSubscriptions ?? 0,
        expiringSoon: expiringSoon ?? 0,
        newThisMonth: newMembersThisMonth ?? 0,
      },
      capacity: {
        weekOccupancyPct,
        weekBooked,
        weekCapacity,
        weekCourses: weekCourses?.length ?? 0,
        byDay: Object.entries(byDay).map(([date, d]) => ({
          date,
          ...d,
          occupancyPct: d.capacity > 0 ? Math.round((d.booked / d.capacity) * 100) : 0,
        })),
      },
      attendance: {
        checkinsThisWeek: checkinsThis,
        checkinsPrevWeek: checkinsPrev,
        checkinsDeltaPct,
      },
      expiring,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
