import { NextRequest, NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';
import { supabaseServer } from '@/lib/supabase';
import type { AdminStatsResponse } from '@/lib/api/stats';
import {
  buildRatesOverTime,
  countBy,
  daysUntil,
  inRange,
  kpi,
  num,
  parseRange,
  previousRange,
  profileName,
  dayOfWeekLabel,
  sumMapIntoBuckets,
  timeSeriesFromMap,
  type DateRange,
} from '@/lib/stats/aggregations';

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };

  const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('is_admin, accessible_portals')
    .eq('email', user.email)
    .single();

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { ok: true as const };
}

function computePeriodMetrics(
  range: DateRange,
  data: {
    members: any[];
    payments: any[];
    courses: any[];
    registrations: any[];
    checkins: any[];
    subscriptions: any[];
    plansById: Map<number, any>;
    classesById: Map<number, any>;
    categoriesById: Map<number, any>;
    trainersById: Map<string, any>;
    groupsById: Map<number, any>;
    sgs: any[];
    onboarding: any[];
    accounts: any[];
    filters: {
      categoryId?: string;
      trainerId?: string;
      planId?: string;
      groupId?: string;
    };
  },
) {
  const {
    members,
    payments,
    courses,
    registrations,
    checkins,
    subscriptions,
    plansById,
    classesById,
    categoriesById,
    trainersById,
    groupsById,
    sgs,
    onboarding,
    accounts,
    filters,
  } = data;

  const categoryId = filters.categoryId ? Number(filters.categoryId) : null;
  const trainerId = filters.trainerId || null;
  const planId = filters.planId ? Number(filters.planId) : null;
  const groupId = filters.groupId ? Number(filters.groupId) : null;

  const courseMatches = (c: any) => {
    if (categoryId != null) {
      const cls = classesById.get(c.class_id);
      if (!cls || cls.category_id !== categoryId) return false;
    }
    if (trainerId && String(c.trainer_id) !== trainerId) return false;
    return true;
  };

  const filteredCourses = courses.filter(courseMatches);
  const courseIds = new Set(filteredCourses.map((c: any) => c.id));

  const filteredRegs = registrations.filter((r: any) => {
    if (!courseIds.has(r.course_id)) return false;
    return true;
  });

  const filteredCheckins = checkins.filter((ch: any) => {
    const reg = registrations.find((r: any) => r.id === ch.registration_id);
    if (!reg) return false;
    return courseIds.has(reg.course_id);
  });

  const filteredPayments = payments.filter((p: any) => {
    if (planId != null) {
      const sub = subscriptions.find((s: any) => s.id === p.subscription_id);
      if (!sub || sub.plan_id !== planId) return false;
    }
    return true;
  });

  const filteredSubs = subscriptions.filter((s: any) => {
    if (planId != null && s.plan_id !== planId) return false;
    return true;
  });

  // --- Overview ---
  const totalMembers = members.length;
  const activeMembers = members.filter((m: any) => m.status === 'active').length;
  const newMembers = members.filter((m: any) => inRange(m.created_at, range)).length;

  const paidInRange = filteredPayments.filter(
    (p: any) => p.payment_status === 'paid' && inRange(p.payment_date || p.created_at, range),
  );
  const paidRevenue = paidInRange.reduce((sum: number, p: any) => sum + num(p.amount), 0);

  const pendingPayments = filteredPayments.filter((p: any) => p.payment_status === 'pending');
  const outstandingAmount = pendingPayments.reduce((sum: number, p: any) => sum + num(p.amount), 0);
  const today = format(new Date(), 'yyyy-MM-dd');
  const overduePayments = pendingPayments.filter(
    (p: any) => p.due_date && p.due_date.slice(0, 10) < today,
  );
  const overdueAmount = overduePayments.reduce((sum: number, p: any) => sum + num(p.amount), 0);

  const regsInRange = filteredRegs.filter((r: any) => {
    const course = filteredCourses.find((c: any) => c.id === r.course_id);
    return course && inRange(course.course_date, range);
  });
  const nonCancelled = regsInRange.filter((r: any) => r.status !== 'cancelled');
  const attendedCount = nonCancelled.filter(
    (r: any) => r.status === 'attended' || filteredCheckins.some((ch: any) => ch.registration_id === r.id),
  ).length;
  const attendanceRate = nonCancelled.length
    ? (attendedCount / nonCancelled.length) * 100
    : 0;

  const completedInRange = filteredCourses.filter(
    (c: any) => c.status === 'completed' && inRange(c.course_date, range),
  );
  let fillSum = 0;
  for (const c of completedInRange) {
    const cap = num(c.max_participants) || 1;
    const filled = num(c.current_participants);
    fillSum += (filled / cap) * 100;
  }
  const avgFillRate = completedInRange.length ? fillSum / completedInRange.length : 0;

  const activeSubs = filteredSubs.filter((s: any) => s.status === 'active');
  const expiringSoon = activeSubs.filter((s: any) => {
    const days = daysUntil(s.end_date);
    return days >= 0 && days <= 14;
  }).length;

  // --- Members ---
  const memberGrowthMap = sumMapIntoBuckets(
    range,
    members
      .filter((m: any) => inRange(m.created_at, range))
      .map((m: any) => ({ date: m.created_at, amount: 1 })),
  );
  const statusBreakdown = countBy(members, (m: any) => m.status || 'unknown');
  const linked = members.filter((m: any) => m.account_id).length;
  const unlinked = members.length - linked;
  const topGuests = [...members]
    .filter((m: any) => num(m.guest_count) > 0)
    .sort((a: any, b: any) => num(b.guest_count) - num(a.guest_count))
    .slice(0, 10)
    .map((m: any) => ({
      id: m.id,
      name: profileName(m.profile) || m.email || 'Unknown',
      guestCount: num(m.guest_count),
    }));

  const professions = countBy(
    members.filter((m: any) => m.profile?.profession),
    (m: any) => m.profile.profession,
  ).slice(0, 12);

  // --- Finances ---
  const revenueMap = sumMapIntoBuckets(
    range,
    paidInRange.map((p: any) => ({
      date: p.payment_date || p.created_at,
      amount: num(p.amount),
    })),
  );
  const paymentsInRange = filteredPayments.filter((p: any) =>
    inRange(p.payment_date || p.created_at, range),
  );
  const byPaymentType = countBy(
    paidInRange,
    (p: any) => p.payment_type || 'unknown',
    (p: any) => num(p.amount),
  );
  const byPlan = countBy(
    paidInRange,
    (p: any) => {
      const sub = subscriptions.find((s: any) => s.id === p.subscription_id);
      const plan = sub ? plansById.get(sub.plan_id) : null;
      return plan?.name || 'Unknown';
    },
    (p: any) => num(p.amount),
  );
  const paidCount = paymentsInRange.filter((p: any) => p.payment_status === 'paid').length;
  const pendingCount = paymentsInRange.filter((p: any) => p.payment_status === 'pending').length;
  const collectionRate =
    paidCount + pendingCount > 0 ? (paidCount / (paidCount + pendingCount)) * 100 : 0;
  const discountTotal = paidInRange.reduce((sum: number, p: any) => sum + num(p.discount), 0);
  const creditOutstanding = members.reduce((sum: number, m: any) => sum + num(m.credit), 0);
  const arpu = activeMembers > 0 ? paidRevenue / activeMembers : 0;

  // --- Attendance ---
  const regsForRates = regsInRange.map((r: any) => {
    const course = filteredCourses.find((c: any) => c.id === r.course_id);
    return { date: course?.course_date || r.registration_date, status: r.status };
  });
  const checkinsInRange = filteredCheckins.filter((ch: any) =>
    inRange(ch.checkin_time, range),
  );
  const volumeRegs = sumMapIntoBuckets(
    range,
    regsInRange.map((r: any) => {
      const course = filteredCourses.find((c: any) => c.id === r.course_id);
      return { date: course?.course_date || r.registration_date, amount: 1 };
    }),
  );
  const volumeCheckins = sumMapIntoBuckets(
    range,
    checkinsInRange.map((ch: any) => ({ date: ch.checkin_time, amount: 1 })),
  );

  const attendedRegs = nonCancelled.filter(
    (r: any) => r.status === 'attended' || filteredCheckins.some((ch: any) => ch.registration_id === r.id),
  );

  const byClass = countBy(attendedRegs, (r: any) => {
    const course = filteredCourses.find((c: any) => c.id === r.course_id);
    const cls = course ? classesById.get(course.class_id) : null;
    return cls?.name || 'Unknown';
  });
  const byCategory = countBy(attendedRegs, (r: any) => {
    const course = filteredCourses.find((c: any) => c.id === r.course_id);
    const cls = course ? classesById.get(course.class_id) : null;
    const cat = cls ? categoriesById.get(cls.category_id) : null;
    return cat?.name || 'Unknown';
  });
  const byTrainer = countBy(attendedRegs, (r: any) => {
    const course = filteredCourses.find((c: any) => c.id === r.course_id);
    if (!course) return 'Unknown';
    const t = trainersById.get(String(course.trainer_id));
    return t?.name || 'Unknown';
  });

  const dowCounts = new Array(7).fill(0);
  const hourCounts = new Array(24).fill(0);
  for (const c of filteredCourses.filter((c: any) => inRange(c.course_date, range))) {
    const d = parseISO(c.course_date.slice(0, 10));
    dowCounts[d.getDay()] += 1;
    const hour = parseInt(String(c.start_time).slice(0, 2), 10);
    if (!Number.isNaN(hour)) hourCounts[hour] += 1;
  }

  // --- Program ---
  const coursesInRange = filteredCourses.filter((c: any) => inRange(c.course_date, range));
  const fillByClassMap = new Map<string, { seats: number; capacity: number }>();
  for (const c of completedInRange) {
    const cls = classesById.get(c.class_id);
    const name = cls?.name || 'Unknown';
    const cur = fillByClassMap.get(name) || { seats: 0, capacity: 0 };
    cur.seats += num(c.current_participants);
    cur.capacity += num(c.max_participants);
    fillByClassMap.set(name, cur);
  }
  const fillRateByClass = Array.from(fillByClassMap.entries())
    .map(([name, v]) => ({
      name,
      seats: v.seats,
      capacity: v.capacity,
      fillRate: v.capacity > 0 ? (v.seats / v.capacity) * 100 : 0,
    }))
    .sort((a, b) => b.fillRate - a.fillRate)
    .slice(0, 15);

  const cancelledCourses = coursesInRange.filter((c: any) => c.status === 'cancelled').length;
  const capacityWaste = completedInRange.reduce(
    (sum: number, c: any) => sum + Math.max(0, num(c.max_participants) - num(c.current_participants)),
    0,
  );
  const completedCourses = completedInRange.length;
  const scheduledCourses = coursesInRange.filter((c: any) => c.status === 'scheduled').length;
  const statusBreakdownCourses = countBy(coursesInRange, (c: any) => c.status || 'unknown');

  // --- Subscriptions ---
  const statusMix = countBy(filteredSubs, (s: any) => s.status || 'unknown');
  const planMixMap = new Map<string, { count: number; revenue: number }>();
  for (const s of filteredSubs) {
    const plan = plansById.get(s.plan_id);
    const name = plan?.name || 'Unknown';
    const cur = planMixMap.get(name) || { count: 0, revenue: 0 };
    cur.count += 1;
    const subPayments = payments.filter(
      (p: any) => p.subscription_id === s.id && p.payment_status === 'paid',
    );
    cur.revenue += subPayments.reduce((sum: number, p: any) => sum + num(p.amount), 0);
    planMixMap.set(name, cur);
  }
  const planMix = Array.from(planMixMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count);

  const membersById = new Map(members.map((m: any) => [m.id, m]));
  const expiringSoonList = activeSubs
    .map((s: any) => {
      const days = daysUntil(s.end_date);
      const member = membersById.get(s.member_id);
      const plan = plansById.get(s.plan_id);
      return {
        id: s.id,
        memberName: profileName(member?.profile),
        planName: plan?.name || 'Unknown',
        endDate: s.end_date?.slice?.(0, 10) || s.end_date,
        daysLeft: days,
      };
    })
    .filter((s) => s.daysLeft >= 0 && s.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 15);

  let filteredSgs = sgs;
  if (groupId != null) {
    filteredSgs = sgs.filter((row: any) => row.group_id === groupId);
  }
  // Only SGS for active filtered subs
  const activeSubIds = new Set(activeSubs.map((s: any) => s.id));
  filteredSgs = filteredSgs.filter((row: any) => activeSubIds.has(row.subscription_id));

  const utilMap = new Map<number, { total: number; remaining: number }>();
  for (const row of filteredSgs) {
    const cur = utilMap.get(row.group_id) || { total: 0, remaining: 0 };
    cur.total += num(row.total_sessions);
    cur.remaining += num(row.sessions_remaining);
    utilMap.set(row.group_id, cur);
  }
  const sessionUtilization = Array.from(utilMap.entries()).map(([gid, v]) => {
    const used = Math.max(0, v.total - v.remaining);
    return {
      groupId: gid,
      groupName: groupsById.get(gid)?.name || `Group ${gid}`,
      total: v.total,
      remaining: v.remaining,
      used,
      utilization: v.total > 0 ? (used / v.total) * 100 : 0,
    };
  }).sort((a, b) => b.utilization - a.utilization);

  const remainingBySub = new Map<number, number>();
  for (const row of sgs) {
    if (!activeSubIds.has(row.subscription_id)) continue;
    remainingBySub.set(
      row.subscription_id,
      (remainingBySub.get(row.subscription_id) ?? 0) + num(row.sessions_remaining),
    );
  }
  const depletedActive = activeSubs.filter(
    (s: any) => (remainingBySub.get(s.id) ?? 0) === 0,
  ).length;

  // --- Trainers ---
  const trainerRows = Array.from(trainersById.entries())
    .map(([id, t]) => {
      const tCourses = coursesInRange.filter((c: any) => String(c.trainer_id) === id);
      if (trainerId && id !== trainerId) return null;
      const tCourseIds = new Set(tCourses.map((c: any) => c.id));
      const tRegs = regsInRange.filter((r: any) => tCourseIds.has(r.course_id));
      const tNonCancel = tRegs.filter((r: any) => r.status !== 'cancelled');
      const tAttended = tNonCancel.filter(
        (r: any) =>
          r.status === 'attended' ||
          filteredCheckins.some((ch: any) => ch.registration_id === r.id),
      );
      const uniqueAttendees = new Set(tAttended.map((r: any) => r.member_id)).size;
      const completed = tCourses.filter((c: any) => c.status === 'completed');
      let fill = 0;
      for (const c of completed) {
        const cap = num(c.max_participants) || 1;
        fill += (num(c.current_participants) / cap) * 100;
      }
      return {
        id,
        name: t.name,
        courses: tCourses.length,
        uniqueAttendees,
        attendanceRate: tNonCancel.length ? (tAttended.length / tNonCancel.length) * 100 : 0,
        fillRate: completed.length ? fill / completed.length : 0,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.courses - a.courses) as any[];

  // --- Acquisition ---
  const discoverySources = countBy(
    onboarding.filter((o: any) => o.discovery_source),
    (o: any) => o.discovery_source,
  );
  const funnel = [
    { name: 'Personal info', value: onboarding.filter((o: any) => o.personal_info_completed).length },
    { name: 'Physical profile', value: onboarding.filter((o: any) => o.physical_profile_completed).length },
    { name: 'Discovery', value: onboarding.filter((o: any) => o.discovery_completed || o.discovery_source).length },
    { name: 'Terms accepted', value: onboarding.filter((o: any) => o.terms_accepted).length },
    { name: 'Completed', value: onboarding.filter((o: any) => o.onboarding_completed).length },
  ];
  const pendingAccounts = accounts.filter((a: any) => a.status === 'pending').length;

  return {
    overview: {
      totalMembers,
      activeMembers,
      newMembers: kpi(newMembers),
      paidRevenue: kpi(paidRevenue),
      outstandingAmount,
      overdueAmount,
      attendanceRate: kpi(attendanceRate),
      avgFillRate: kpi(avgFillRate),
      activeSubscriptions: activeSubs.length,
      expiringSoon,
    },
    members: {
      growth: timeSeriesFromMap(range, memberGrowthMap),
      statusBreakdown,
      linkedVsUnlinked: [
        { name: 'Linked', value: linked },
        { name: 'Unlinked', value: unlinked },
      ],
      topGuests,
      professions,
    },
    finances: {
      revenueOverTime: timeSeriesFromMap(range, revenueMap),
      byPaymentType,
      byPlan,
      collectionRate,
      discountTotal,
      creditOutstanding,
      arpu,
      outstandingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      paidCount,
      pendingCount,
    },
    attendance: {
      ratesOverTime: buildRatesOverTime(range, regsForRates),
      volumeOverTime: timeSeriesFromMap(range, volumeRegs, volumeCheckins),
      byClass: byClass.slice(0, 12),
      byCategory: byCategory.slice(0, 12),
      byTrainer: byTrainer.slice(0, 12),
      peakDayOfWeek: dowCounts.map((value, i) => ({
        name: dayOfWeekLabel(i),
        value,
      })),
      peakHour: hourCounts
        .map((value, i) => ({ name: `${String(i).padStart(2, '0')}:00`, value }))
        .filter((h) => h.value > 0),
      totals: {
        registrations: regsInRange.length,
        attended: attendedCount,
        absent: regsInRange.filter((r: any) => r.status === 'absent').length,
        cancelled: regsInRange.filter((r: any) => r.status === 'cancelled').length,
        checkins: checkinsInRange.length,
      },
    },
    program: {
      fillRateByClass,
      cancelledCourses,
      capacityWaste,
      completedCourses,
      scheduledCourses,
      statusBreakdown: statusBreakdownCourses,
    },
    subscriptions: {
      statusMix,
      planMix,
      expiringSoon: expiringSoonList,
      sessionUtilization,
      depletedActive,
    },
    trainers: { rows: trainerRows },
    acquisition: {
      discoverySources,
      funnel,
      pendingAccounts,
    },
    _raw: {
      newMembers,
      paidRevenue,
      attendanceRate,
      avgFillRate,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const compare = searchParams.get('compare') === '1' || searchParams.get('compare') === 'true';
    const categoryId = searchParams.get('categoryId') || undefined;
    const trainerId = searchParams.get('trainerId') || undefined;
    const planId = searchParams.get('planId') || undefined;
    const groupId = searchParams.get('groupId') || undefined;

    const today = new Date();
    const defaultTo = format(today, 'yyyy-MM-dd');
    const defaultFrom = format(new Date(today.getTime() - 29 * 86400000), 'yyyy-MM-dd');
    const from = fromParam || defaultFrom;
    const to = toParam || defaultTo;
    const range = parseRange(from, to);
    const filters = { categoryId, trainerId, planId, groupId };

    const sb = supabaseServer();

    const [
      membersRes,
      paymentsRes,
      coursesRes,
      regsRes,
      checkinsRes,
      subsRes,
      plansRes,
      classesRes,
      categoriesRes,
      trainersRes,
      groupsRes,
      sgsRes,
      onboardingRes,
      accountsRes,
      profilesRes,
    ] = await Promise.all([
      sb.from('members').select('id, account_id, profile_id, credit, status, guest_count, created_at'),
      sb.from('payments').select('*'),
      sb.from('courses').select('*'),
      sb.from('class_registrations').select('*'),
      sb.from('checkins').select('*'),
      sb.from('subscriptions').select('*'),
      sb.from('plans').select('id, name, price, is_active'),
      sb.from('classes').select('id, name, category_id, max_capacity, is_active'),
      sb.from('categories').select('id, name, is_active'),
      sb.from('trainers').select('id, account_id, profile_id, status, specialization'),
      sb.from('groups').select('id, name, is_active'),
      sb.from('subscription_group_sessions').select('*'),
      sb.from('member_onboarding').select('*'),
      sb.from('accounts').select('id, status, is_admin, created_at'),
      sb.from('profiles').select('id, first_name, last_name, profession, date_of_birth'),
    ]);

    const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const members = (membersRes.data || []).map((m: any) => ({
      ...m,
      profile: profilesById.get(m.profile_id) || null,
    }));

    const trainersRaw = trainersRes.data || [];
    const trainersById = new Map<string, { name: string; id: string }>();
    for (const t of trainersRaw) {
      const profile = profilesById.get(t.profile_id);
      trainersById.set(String(t.id), {
        id: String(t.id),
        name: profileName(profile),
      });
    }

    const plansById = new Map((plansRes.data || []).map((p: any) => [p.id, p]));
    const classesById = new Map((classesRes.data || []).map((c: any) => [c.id, c]));
    const categoriesById = new Map((categoriesRes.data || []).map((c: any) => [c.id, c]));
    const groupsById = new Map((groupsRes.data || []).map((g: any) => [g.id, g]));

    const payload = {
      members,
      payments: paymentsRes.data || [],
      courses: coursesRes.data || [],
      registrations: regsRes.data || [],
      checkins: checkinsRes.data || [],
      subscriptions: subsRes.data || [],
      plansById,
      classesById,
      categoriesById,
      trainersById,
      groupsById,
      sgs: sgsRes.data || [],
      onboarding: onboardingRes.data || [],
      accounts: accountsRes.data || [],
      filters,
    };

    const current = computePeriodMetrics(range, payload);

    if (compare) {
      const prev = previousRange(range);
      const previous = computePeriodMetrics(prev, payload);
      current.overview.newMembers = kpi(
        current._raw.newMembers,
        previous._raw.newMembers,
      );
      current.overview.paidRevenue = kpi(
        current._raw.paidRevenue,
        previous._raw.paidRevenue,
      );
      current.overview.attendanceRate = kpi(
        current._raw.attendanceRate,
        previous._raw.attendanceRate,
      );
      current.overview.avgFillRate = kpi(
        current._raw.avgFillRate,
        previous._raw.avgFillRate,
      );

      const response: AdminStatsResponse = {
        meta: {
          from,
          to,
          previousFrom: format(prev.from, 'yyyy-MM-dd'),
          previousTo: format(prev.to, 'yyyy-MM-dd'),
          compare: true,
          filters,
        },
        options: {
          categories: (categoriesRes.data || []).map((c: any) => ({ id: c.id, name: c.name })),
          trainers: Array.from(trainersById.values()),
          plans: (plansRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
          groups: (groupsRes.data || []).map((g: any) => ({ id: g.id, name: g.name })),
        },
        overview: current.overview,
        members: current.members,
        finances: current.finances,
        attendance: current.attendance,
        program: current.program,
        subscriptions: current.subscriptions,
        trainers: current.trainers,
        acquisition: current.acquisition,
      };
      return NextResponse.json(response);
    }

    const response: AdminStatsResponse = {
      meta: {
        from,
        to,
        compare: false,
        filters,
      },
      options: {
        categories: (categoriesRes.data || []).map((c: any) => ({ id: c.id, name: c.name })),
        trainers: Array.from(trainersById.values()),
        plans: (plansRes.data || []).map((p: any) => ({ id: p.id, name: p.name })),
        groups: (groupsRes.data || []).map((g: any) => ({ id: g.id, name: g.name })),
      },
      overview: current.overview,
      members: current.members,
      finances: current.finances,
      attendance: current.attendance,
      program: current.program,
      subscriptions: current.subscriptions,
      trainers: current.trainers,
      acquisition: current.acquisition,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
