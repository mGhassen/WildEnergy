import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { toDateKey } from '@/lib/date';
import { expirePastSubscriptions } from '@/lib/expire-subscriptions';
import { fetchActiveParticipantCountsByCourse } from '@/lib/course-active-participants';

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

/** Mon–Sun calendar week; this week is Mon→today vs same Mon→weekday last week. */
function calendarWeekBounds(today: string) {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0=Sun
  const daysFromMonday = (dow + 6) % 7;
  const weekStart = addDays(today, -daysFromMonday);
  const prevWeekStart = addDays(weekStart, -7);
  const prevSameWeekday = addDays(prevWeekStart, daysFromMonday);
  return {
    weekStart,
    weekEnd: today,
    prevWeekStart,
    prevWeekEnd: prevSameWeekday,
  };
}

function sumAmounts(rows: { amount?: number | string }[] | null | undefined) {
  return (rows || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

function paymentDateKey(p: { payment_date?: string | null; created_at?: string | null }) {
  return toDateKey(p.payment_date) || toDateKey(p.created_at);
}

function inDateKeyRange(key: string | null, start: string, end: string) {
  return !!key && key >= start && key <= end;
}

type RiskRow = {
  id: number;
  endDate: string;
  planName: string;
  memberName: string;
  memberId: string | null;
  sessionsRemaining: number;
  reason: 'ending' | 'sessions' | 'both';
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const {
      data: { user: adminUser },
      error: authError,
    } = await supabaseServer().auth.getUser(token);
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

    await expirePastSubscriptions();

    const today = toDateKey(new Date())!;
    const capacityWeekEnd = addDays(today, 6);
    const expireUntil = addDays(today, 7);
    const { monthStart, prevMonthStart, prevMonthEnd } = monthBounds(today);
    const { weekStart, weekEnd, prevWeekStart, prevWeekEnd } = calendarWeekBounds(today);

    const sb = supabaseServer();

    const [
      { count: activeSubscriptions },
      { count: pendingSubscriptions },
      { count: newMembersThisMonth },
      { data: paidWithDate },
      { data: paidNullDate },
      { data: weekCourses },
      { count: checkinsThisWeek },
      { count: checkinsPrevWeek },
      { data: activeSubsForRisk },
    ] = await Promise.all([
      sb
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', today),
      sb
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      sb
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${monthStart}T00:00:00.000Z`),
      sb
        .from('payments')
        .select('amount, payment_date, created_at')
        .eq('payment_status', 'paid')
        .not('payment_date', 'is', null)
        .gte('payment_date', prevMonthStart)
        .lte('payment_date', today),
      sb
        .from('payments')
        .select('amount, payment_date, created_at')
        .eq('payment_status', 'paid')
        .is('payment_date', null)
        .gte('created_at', `${prevMonthStart}T00:00:00.000Z`)
        .lte('created_at', `${today}T23:59:59.999Z`),
      sb
        .from('courses')
        .select('id, course_date, max_participants, current_participants, status')
        .gte('course_date', today)
        .lte('course_date', capacityWeekEnd)
        .neq('status', 'cancelled'),
      sb
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('checkin_time', `${weekStart}T00:00:00.000Z`)
        .lte('checkin_time', `${weekEnd}T23:59:59.999Z`),
      sb
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('checkin_time', `${prevWeekStart}T00:00:00.000Z`)
        .lte('checkin_time', `${prevWeekEnd}T23:59:59.999Z`),
      sb
        .from('subscriptions')
        .select(
          `
          id,
          end_date,
          members:member_id(
            id,
            profiles:profile_id(first_name, last_name)
          ),
          plan:plans(name),
          subscription_group_sessions(sessions_remaining)
        `,
        )
        .eq('status', 'active')
        .gte('end_date', today),
    ]);

    const allPaid = [...(paidWithDate || []), ...(paidNullDate || [])];
    const monthPayments = allPaid.filter((p) =>
      inDateKeyRange(paymentDateKey(p), monthStart, today),
    );
    const prevMonthPayments = allPaid.filter((p) =>
      inDateKeyRange(paymentDateKey(p), prevMonthStart, prevMonthEnd),
    );

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
    const weekCourseRows = weekCourses || [];
    const weekActiveCounts = await fetchActiveParticipantCountsByCourse(
      sb,
      weekCourseRows.map((c: { id: number }) => c.id),
    );

    for (const c of weekCourseRows) {
      const key = c.course_date;
      if (!byDay[key]) continue;
      byDay[key].courses += 1;
      byDay[key].booked += weekActiveCounts.get(c.id) ?? c.current_participants ?? 0;
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

    const riskRows: RiskRow[] = [];
    for (const row of activeSubsForRisk || []) {
      const endKey = toDateKey(row.end_date) || '';
      const endingSoon = !!endKey && endKey >= today && endKey <= expireUntil;
      const sgs = Array.isArray(row.subscription_group_sessions)
        ? row.subscription_group_sessions
        : [];
      const sessionsRemaining = sgs.reduce(
        (sum: number, g: { sessions_remaining?: number | null }) =>
          sum + (Number(g.sessions_remaining) || 0),
        0,
      );
      // Only session-tracked packs — no SGS rows ⇒ not a "sessions left" risk
      const lowSessions = sgs.length > 0 && sessionsRemaining <= 1;
      if (!endingSoon && !lowSessions) continue;

      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      const profiles = member?.profiles;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;

      riskRows.push({
        id: row.id,
        endDate: endKey,
        planName: plan?.name || 'Plan',
        memberName:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Member',
        memberId: member?.id || null,
        sessionsRemaining,
        reason: endingSoon && lowSessions ? 'both' : endingSoon ? 'ending' : 'sessions',
      });
    }

    riskRows.sort((a, b) => {
      if (a.sessionsRemaining !== b.sessionsRemaining) {
        return a.sessionsRemaining - b.sessionsRemaining;
      }
      return a.endDate.localeCompare(b.endDate);
    });

    return NextResponse.json({
      asOf: today,
      cash: {
        revenueThisMonth,
        revenuePrevMonth,
        revenueDeltaPct,
        paymentsThisMonth: monthPayments.length,
      },
      membership: {
        active: activeSubscriptions ?? 0,
        pendingPayment: pendingSubscriptions ?? 0,
        expiringSoon: riskRows.length,
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
      expiring: riskRows.slice(0, 6),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
