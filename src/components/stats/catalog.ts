import type {
  AdminStatsResponse,
  NamedCount,
  RatePoint,
  StatsComparisonKpis,
  TimePoint,
} from "@/lib/api/stats"
import { formatCurrency } from "@/lib/config"

export type StatsTab =
  | "overview"
  | "members"
  | "finances"
  | "attendance"
  | "program"
  | "subscriptions"
  | "trainers"

export type WidgetViz = "kpi" | "timeseries" | "hbar" | "vbar" | "pie" | "rates" | "table"

export type MetricParamDef = {
  key: string
  label: string
  options: Array<{ value: string; label: string }>
  defaultValue: string
}

export type MetricDef = {
  id: string
  object: string
  label: string
  description: string
  tabs: StatsTab[]
  viz: WidgetViz
  defaultW: number
  defaultH: number
  params?: MetricParamDef[]
  /** Resolve display payload from API stats + widget params */
  resolve: (data: AdminStatsResponse, params: Record<string, string>) => MetricPayload
}

export type MetricPayload =
  | {
      kind: "kpi"
      title: string
      value: string
      hint?: string
      deltaPct?: number | null
      previousLabel?: string
    }
  | {
      kind: "timeseries"
      title: string
      points: TimePoint[]
      valueLabel: string
      secondaryLabel?: string
      previousLabel?: string
      currency?: boolean
    }
  | { kind: "named"; title: string; items: NamedCount[]; currency?: boolean; valueLabel?: string }
  | { kind: "rates"; title: string; points: RatePoint[]; showPrevious?: boolean }
  | {
      kind: "table"
      title: string
      columns: Array<{ key: string; label: string; align?: "left" | "right" }>
      rows: Array<Record<string, string | number>>
    }

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

function delta(d: AdminStatsResponse, key: keyof StatsComparisonKpis): number | null | undefined {
  if (!d.meta.compare || !d.comparison) return undefined
  return d.comparison.kpis[key].deltaPct
}

function prevHint(
  d: AdminStatsResponse,
  key: keyof StatsComparisonKpis,
  format: (n: number) => string,
): string | undefined {
  if (!d.meta.compare || !d.comparison) return undefined
  const prev = d.comparison.kpis[key].previous
  if (prev === undefined) return undefined
  return `prev ${format(prev)}`
}

function withPreviousLabel(d: AdminStatsResponse, points: TimePoint[], title: string) {
  const showPrev = Boolean(d.meta.compare && points.some((p) => p.previous != null))
  return {
    previousLabel: showPrev ? "Previous period" : undefined,
    title: showPrev ? `${title} vs previous` : title,
  }
}

function fillRateNamed(data: AdminStatsResponse): NamedCount[] {
  return data.program.fillRateByClass.map((r) => ({
    name: r.name,
    value: Math.round(r.fillRate * 10) / 10,
  }))
}

export const METRIC_CATALOG: MetricDef[] = [
  // —— Overview / KPIs ——
  {
    id: "kpi.period_revenue",
    object: "Payments",
    label: "Period revenue",
    description: "Total money actually received (paid payments only) during the selected dates. Ignores pending/failed.",
    tabs: ["overview", "finances"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Period revenue",
      value: formatCurrency(d.overview.paidRevenue.value),
      hint: [prevHint(d, "paidRevenue", formatCurrency), "paid only"].filter(Boolean).join(" · "),
      deltaPct: delta(d, "paidRevenue"),
      previousLabel: prevHint(d, "paidRevenue", formatCurrency),
    }),
  },
  {
    id: "kpi.avg_ticket",
    object: "Payments",
    label: "Average ticket",
    description: "Average amount per paid payment in the period (period revenue ÷ number of paid payments).",
    tabs: ["overview", "finances"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Avg ticket",
      value: formatCurrency(
        d.finances.paidCount > 0 ? d.overview.paidRevenue.value / d.finances.paidCount : 0,
      ),
      hint: [prevHint(d, "avgTicket", formatCurrency), `${d.finances.paidCount} paid`]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "avgTicket"),
    }),
  },
  {
    id: "kpi.outstanding",
    object: "Payments",
    label: "Outstanding",
    description: "Unpaid invoices still pending, with a due date (or create date) inside the selected period. Overdue = pending past due.",
    tabs: ["overview", "finances"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Outstanding",
      value: formatCurrency(d.overview.outstandingAmount),
      hint: [
        prevHint(d, "outstandingAmount", formatCurrency),
        `${formatCurrency(d.overview.overdueAmount)} overdue`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "outstandingAmount"),
    }),
  },
  {
    id: "kpi.collection_rate",
    object: "Payments",
    label: "Collection rate",
    description: "Share of period payments that were collected: paid ÷ (paid + pending) in the selected dates.",
    tabs: ["overview", "finances"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Collection rate",
      value: pct(d.finances.collectionRate),
      hint: [
        prevHint(d, "collectionRate", pct),
        `${d.finances.paidCount} paid · ${d.finances.pendingCount} pending`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "collectionRate"),
    }),
  },
  {
    id: "kpi.attendance_rate",
    object: "Attendance",
    label: "Attendance rate",
    description: "% of non-cancelled bookings that showed up for courses in this period (attended or checked in).",
    tabs: ["overview", "attendance"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Attendance",
      value: pct(d.overview.attendanceRate.value),
      hint: [
        prevHint(d, "attendanceRate", pct),
        `${d.attendance.totals.attended}/${d.attendance.totals.registrations - d.attendance.totals.cancelled} non-cancelled`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "attendanceRate"),
    }),
  },
  {
    id: "kpi.fill_rate",
    object: "Courses",
    label: "Fill rate",
    description: "How full classes were on average in this period: seats used ÷ capacity across courses that ran.",
    tabs: ["overview", "program"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Fill rate",
      value: pct(d.overview.avgFillRate.value),
      hint: [
        prevHint(d, "avgFillRate", pct),
        `${d.program.capacityWaste} empty seats · ${d.program.completedCourses + d.program.scheduledCourses} courses`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "avgFillRate"),
    }),
  },
  {
    id: "kpi.active_members",
    object: "Members",
    label: "Active in period",
    description: "Distinct members who were active in this period: had a subscription overlapping the dates, a class booking, or a check-in.",
    tabs: ["overview", "members"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Active in period",
      value: String(d.overview.activeMembers),
      hint: [
        prevHint(d, "activeMembers", String),
        `roster ${d.overview.totalMembers} · +${d.overview.newMembers.value} new`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "activeMembers"),
    }),
  },
  {
    id: "kpi.active_subs",
    object: "Subscriptions",
    label: "Subs in period",
    description: "Subscriptions whose start–end window overlaps the selected period (active or pending).",
    tabs: ["overview", "subscriptions"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Subs in period",
      value: String(d.overview.activeSubscriptions),
      hint: [
        prevHint(d, "activeSubscriptions", String),
        `${d.overview.expiringSoon} expiring ≤14d`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "activeSubscriptions"),
    }),
  },
  {
    id: "kpi.credit_wallet",
    object: "Members",
    label: "Credit on accounts",
    description: "Total unused credit sitting on member wallets right now (not period-bound). Hint also shows discounts given in the period.",
    tabs: ["overview", "finances", "members"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Credit on accounts",
      value: formatCurrency(d.finances.creditOutstanding),
      hint: [
        prevHint(d, "discountTotal", (n) => `discounts ${formatCurrency(n)}`),
        `Discounts in period: ${formatCurrency(d.finances.discountTotal)}`,
      ]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "discountTotal"),
    }),
  },
  {
    id: "kpi.depleted_sessions",
    object: "Subscriptions",
    label: "Depleted sessions",
    description: "Subscriptions active in this period that have 0 sessions left across their groups — renewals / upsells.",
    tabs: ["overview", "subscriptions"],
    viz: "kpi",
    defaultW: 2,
    defaultH: 2,
    resolve: (d) => ({
      kind: "kpi",
      title: "Depleted sessions",
      value: String(d.subscriptions.depletedActive),
      hint: [prevHint(d, "depletedActive", String), "0 sessions remaining"]
        .filter(Boolean)
        .join(" · "),
      deltaPct: delta(d, "depletedActive"),
    }),
  },

  // —— Charts ——
  {
    id: "chart.revenue_trend",
    object: "Payments",
    label: "Revenue trend",
    description: "Paid revenue over time in the selected period. Dashed line = previous period when compare is on.",
    tabs: ["overview", "finances"],
    viz: "timeseries",
    defaultW: 4,
    defaultH: 3,
    resolve: (d) => {
      const meta = withPreviousLabel(d, d.finances.revenueOverTime, "Revenue trend")
      return {
        kind: "timeseries",
        title: meta.title,
        points: d.finances.revenueOverTime,
        valueLabel: "Paid revenue",
        previousLabel: meta.previousLabel,
        currency: true,
      }
    },
  },
  {
    id: "chart.member_growth",
    object: "Members",
    label: "Member growth",
    description: "How many new members joined each day/week in the selected period.",
    tabs: ["overview", "members"],
    viz: "timeseries",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => {
      const meta = withPreviousLabel(d, d.members.growth, "Member growth")
      return {
        kind: "timeseries",
        title: meta.title,
        points: d.members.growth,
        valueLabel: "New members",
        previousLabel: meta.previousLabel,
      }
    },
  },
  {
    id: "chart.booking_volume",
    object: "Attendance",
    label: "Booking volume",
    description: "Bookings vs actual check-ins over time in the selected period.",
    tabs: ["overview", "attendance"],
    viz: "timeseries",
    defaultW: 3,
    defaultH: 3,
    params: [
      {
        key: "mode",
        label: "Series",
        defaultValue: "both",
        options: [
          { value: "both", label: "Both" },
          { value: "regs", label: "Registrations" },
          { value: "checkins", label: "Check-ins" },
        ],
      },
    ],
    resolve: (d, params) => {
      const mode = params.mode || "both"
      const showPrev = Boolean(
        d.meta.compare && d.attendance.volumeOverTime.some((p) => p.previous != null),
      )
      if (mode === "checkins") {
        return {
          kind: "timeseries",
          title: "Check-ins",
          points: d.attendance.volumeOverTime.map((p) => ({
            date: p.date,
            value: p.secondary ?? 0,
          })),
          valueLabel: "Check-ins",
        }
      }
      if (mode === "regs") {
        return {
          kind: "timeseries",
          title: showPrev ? "Registrations vs previous" : "Registrations",
          points: d.attendance.volumeOverTime.map((p) => ({
            date: p.date,
            value: p.value,
            previous: p.previous,
          })),
          valueLabel: "Registrations",
          previousLabel: showPrev ? "Previous period" : undefined,
        }
      }
      return {
        kind: "timeseries",
        title: showPrev ? "Booking volume vs previous" : "Booking volume",
        points: d.attendance.volumeOverTime,
        valueLabel: "Registrations",
        secondaryLabel: "Check-ins",
        previousLabel: showPrev ? "Previous period" : undefined,
      }
    },
  },
  {
    id: "chart.attendance_rates",
    object: "Attendance",
    label: "Attendance quality",
    description: "Quality of bookings in the period: % attended, no-show, and cancelled over time.",
    tabs: ["overview", "attendance"],
    viz: "rates",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => ({
      kind: "rates",
      title: d.meta.compare ? "Attendance quality vs previous" : "Attendance quality",
      points: d.attendance.ratesOverTime,
      showPrevious: Boolean(
        d.meta.compare &&
          d.attendance.ratesOverTime.some((p) => p.previousAttendance != null),
      ),
    }),
  },
  {
    id: "chart.revenue_mix",
    object: "Payments",
    label: "Revenue mix",
    description: "Where period revenue came from — by plan or by payment method (cash/card/…).",
    tabs: ["overview", "finances"],
    viz: "hbar",
    defaultW: 3,
    defaultH: 3,
    params: [
      {
        key: "by",
        label: "Group by",
        defaultValue: "plan",
        options: [
          { value: "plan", label: "Plan" },
          { value: "type", label: "Payment type" },
        ],
      },
    ],
    resolve: (d, params) => ({
      kind: "named",
      title: params.by === "type" ? "By payment type" : "By plan",
      items: params.by === "type" ? d.finances.byPaymentType : d.finances.byPlan,
      currency: true,
      valueLabel: "Revenue",
    }),
  },
  {
    id: "chart.attendance_breakdown",
    object: "Attendance",
    label: "Who shows up",
    description: "Who actually showed up — count of attended bookings grouped by class, category, or trainer.",
    tabs: ["overview", "attendance"],
    viz: "hbar",
    defaultW: 3,
    defaultH: 3,
    params: [
      {
        key: "by",
        label: "Group by",
        defaultValue: "class",
        options: [
          { value: "class", label: "Class" },
          { value: "category", label: "Category" },
          { value: "trainer", label: "Trainer" },
        ],
      },
    ],
    resolve: (d, params) => {
      const by = params.by || "class"
      const items =
        by === "category"
          ? d.attendance.byCategory
          : by === "trainer"
            ? d.attendance.byTrainer
            : d.attendance.byClass
      return {
        kind: "named",
        title: `Attendance by ${by}`,
        items,
        valueLabel: "Attended",
      }
    },
  },
  {
    id: "chart.schedule_peaks",
    object: "Courses",
    label: "Schedule demand",
    description: "When classes ran in this period — demand by weekday or start hour.",
    tabs: ["overview", "program", "attendance"],
    viz: "vbar",
    defaultW: 3,
    defaultH: 3,
    params: [
      {
        key: "by",
        label: "Bucket",
        defaultValue: "day",
        options: [
          { value: "day", label: "Day of week" },
          { value: "hour", label: "Hour" },
        ],
      },
    ],
    resolve: (d, params) => ({
      kind: "named",
      title: params.by === "hour" ? "By hour" : "By day",
      items: params.by === "hour" ? d.attendance.peakHour : d.attendance.peakDayOfWeek,
      valueLabel: "Courses",
    }),
  },
  {
    id: "chart.fill_by_class",
    object: "Courses",
    label: "Fill rate by class",
    description: "Which class types filled best in this period (seats used ÷ capacity).",
    tabs: ["overview", "program"],
    viz: "hbar",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => ({
      kind: "named",
      title: "Fill rate by class",
      items: fillRateNamed(d),
      valueLabel: "Fill %",
    }),
  },
  {
    id: "chart.member_status",
    object: "Members",
    label: "Member status",
    description: "Snapshot of all members by account status (active, inactive, suspended) — not limited to the period.",
    tabs: ["overview", "members"],
    viz: "pie",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => ({
      kind: "named",
      title: "Member status",
      items: d.members.statusBreakdown,
    }),
  },
  {
    id: "chart.sub_status",
    object: "Subscriptions",
    label: "Subscription status",
    description: "How subscriptions are split by lifecycle status right now (active, pending, expired, cancelled).",
    tabs: ["overview", "subscriptions"],
    viz: "pie",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => ({
      kind: "named",
      title: "Subscription status",
      items: d.subscriptions.statusMix,
    }),
  },
  {
    id: "chart.course_status",
    object: "Courses",
    label: "Course status",
    description: "Courses that fall in the period, counted by status (scheduled, completed, cancelled, etc.).",
    tabs: ["overview", "program"],
    viz: "vbar",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => ({
      kind: "named",
      title: "Course status",
      items: d.program.statusBreakdown,
      valueLabel: "Courses",
    }),
  },
  {
    id: "chart.payment_volume",
    object: "Payments",
    label: "Payment volume",
    description: "How many payments in the period sit in each bucket: paid, pending, outstanding, and overdue.",
    tabs: ["finances"],
    viz: "vbar",
    defaultW: 3,
    defaultH: 3,
    resolve: (d) => ({
      kind: "named",
      title: "Payment volume",
      items: [
        { name: "Paid", value: d.finances.paidCount },
        { name: "Pending", value: d.finances.pendingCount },
        { name: "Outstanding", value: d.finances.outstandingCount },
        { name: "Overdue", value: d.finances.overdueCount },
      ],
    }),
  },

  // —— Tables ——
  {
    id: "table.expiring_subs",
    object: "Subscriptions",
    label: "Expiring soon",
    description: "Members whose active subscription ends within 14 days — renewals to chase.",
    tabs: ["overview", "subscriptions"],
    viz: "table",
    defaultW: 3,
    defaultH: 4,
    resolve: (d) => ({
      kind: "table",
      title: "Expiring ≤14 days",
      columns: [
        { key: "member", label: "Member" },
        { key: "plan", label: "Plan" },
        { key: "days", label: "Days", align: "right" },
      ],
      rows: d.subscriptions.expiringSoon.map((r) => ({
        member: r.memberName,
        plan: r.planName,
        days: r.daysLeft,
      })),
    }),
  },
  {
    id: "table.session_burn",
    object: "Subscriptions",
    label: "Session burn",
    description: "Sessions used vs remaining per subscription group, plus burn % (used ÷ total).",
    tabs: ["overview", "subscriptions"],
    viz: "table",
    defaultW: 3,
    defaultH: 4,
    resolve: (d) => ({
      kind: "table",
      title: "Session burn",
      columns: [
        { key: "group", label: "Group" },
        { key: "used", label: "Used", align: "right" },
        { key: "left", label: "Left", align: "right" },
        { key: "burn", label: "Burn", align: "right" },
      ],
      rows: d.subscriptions.sessionUtilization.map((g) => ({
        group: g.groupName,
        used: `${g.used}/${g.total}`,
        left: g.remaining,
        burn: pct(g.utilization),
      })),
    }),
  },
  {
    id: "table.plan_mix",
    object: "Subscriptions",
    label: "Plan mix",
    description: "How many overlapping subscriptions per plan in the period, plus paid revenue attributed to that plan.",
    tabs: ["subscriptions", "finances"],
    viz: "table",
    defaultW: 3,
    defaultH: 4,
    resolve: (d) => ({
      kind: "table",
      title: "Plan mix",
      columns: [
        { key: "plan", label: "Plan" },
        { key: "count", label: "Subs", align: "right" },
        { key: "revenue", label: "Paid in", align: "right" },
      ],
      rows: d.subscriptions.planMix.map((p) => ({
        plan: p.name,
        count: p.count,
        revenue: formatCurrency(p.revenue),
      })),
    }),
  },
  {
    id: "table.trainers",
    object: "Trainers",
    label: "Trainer load",
    description: "Per trainer in the period: courses taught, unique attendees, attendance rate, and average fill.",
    tabs: ["overview", "trainers"],
    viz: "table",
    defaultW: 6,
    defaultH: 4,
    resolve: (d) => ({
      kind: "table",
      title: "Trainer load",
      columns: [
        { key: "name", label: "Trainer" },
        { key: "courses", label: "Courses", align: "right" },
        { key: "attendees", label: "Attendees", align: "right" },
        { key: "attendance", label: "Attendance", align: "right" },
        { key: "fill", label: "Fill", align: "right" },
      ],
      rows: d.trainers.rows.map((r) => ({
        name: r.name,
        courses: r.courses,
        attendees: r.uniqueAttendees,
        attendance: pct(r.attendanceRate),
        fill: pct(r.fillRate),
      })),
    }),
  },
  {
    id: "table.top_guests",
    object: "Members",
    label: "Top guest visits",
    description: "Members who were checked in as guests by an admin most often in the period.",
    tabs: ["members"],
    viz: "table",
    defaultW: 3,
    defaultH: 4,
    resolve: (d) => ({
      kind: "table",
      title: "Top guests",
      columns: [
        { key: "name", label: "Member" },
        { key: "visits", label: "Visits", align: "right" },
      ],
      rows: d.members.topGuests.map((g) => ({
        name: g.name,
        visits: g.guestCount,
      })),
    }),
  },
  {
    id: "table.fill_detail",
    object: "Courses",
    label: "Class capacity detail",
    description: "Per class type in the period: seats taken, total capacity, and fill %.",
    tabs: ["program"],
    viz: "table",
    defaultW: 4,
    defaultH: 4,
    resolve: (d) => ({
      kind: "table",
      title: "Class capacity",
      columns: [
        { key: "name", label: "Class" },
        { key: "seats", label: "Seats", align: "right" },
        { key: "capacity", label: "Capacity", align: "right" },
        { key: "fill", label: "Fill", align: "right" },
      ],
      rows: d.program.fillRateByClass.map((r) => ({
        name: r.name,
        seats: r.seats,
        capacity: r.capacity,
        fill: pct(r.fillRate),
      })),
    }),
  },
]

export function getMetric(id: string): MetricDef | undefined {
  return METRIC_CATALOG.find((m) => m.id === id)
}

export function metricsForTab(tab: StatsTab): MetricDef[] {
  return METRIC_CATALOG.filter((m) => m.tabs.includes(tab))
}

export function defaultParams(metric: MetricDef): Record<string, string> {
  const params: Record<string, string> = {}
  for (const p of metric.params || []) params[p.key] = p.defaultValue
  return params
}

export const TAB_DEFS: Array<{ id: StatsTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "finances", label: "Finances" },
  { id: "attendance", label: "Attendance" },
  { id: "program", label: "Program" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "trainers", label: "Trainers" },
]

/** Seed layouts per tab so first visit isn't empty */
export function defaultBoard(tab: StatsTab): BoardState {
  const seeds: Record<StatsTab, string[]> = {
    overview: [
      "kpi.period_revenue",
      "kpi.avg_ticket",
      "kpi.outstanding",
      "kpi.attendance_rate",
      "kpi.fill_rate",
      "kpi.active_members",
      "chart.revenue_trend",
      "chart.revenue_mix",
      "chart.attendance_rates",
      "chart.attendance_breakdown",
      "table.expiring_subs",
      "table.session_burn",
    ],
    members: [
      "kpi.active_members",
      "chart.member_growth",
      "chart.member_status",
      "table.top_guests",
      "kpi.credit_wallet",
    ],
    finances: [
      "kpi.period_revenue",
      "kpi.avg_ticket",
      "kpi.collection_rate",
      "kpi.outstanding",
      "chart.revenue_trend",
      "chart.revenue_mix",
      "chart.payment_volume",
      "table.plan_mix",
    ],
    attendance: [
      "kpi.attendance_rate",
      "chart.attendance_rates",
      "chart.booking_volume",
      "chart.attendance_breakdown",
      "chart.schedule_peaks",
    ],
    program: [
      "kpi.fill_rate",
      "chart.fill_by_class",
      "chart.course_status",
      "chart.schedule_peaks",
      "table.fill_detail",
    ],
    subscriptions: [
      "kpi.active_subs",
      "kpi.depleted_sessions",
      "chart.sub_status",
      "table.plan_mix",
      "table.session_burn",
      "table.expiring_subs",
    ],
    trainers: ["table.trainers"],
  }

  const ids = seeds[tab]
  const widgets: BoardWidget[] = []
  const layouts: BoardLayoutItem[] = []
  let x = 0
  let y = 0
  let rowH = 0

  for (const metricId of ids) {
    const metric = getMetric(metricId)
    if (!metric) continue
    const id = `${metricId}__seed`
    // KPIs: always 3 per row (w=2 on 6 cols), flat rectangles
    const w = metric.viz === "kpi" ? 2 : metric.defaultW
    const h = metric.viz === "kpi" ? 2 : metric.defaultH
    if (x + w > 6) {
      x = 0
      y += rowH
      rowH = 0
    }
    widgets.push({
      id,
      metricId,
      params: defaultParams(metric),
    })
    layouts.push({
      i: id,
      x,
      y,
      w,
      h,
      minW: metric.viz === "kpi" ? 2 : 2,
      minH: metric.viz === "kpi" ? 2 : 2,
      maxH: metric.viz === "kpi" ? 3 : undefined,
    })
    x += w
    rowH = Math.max(rowH, h)
  }

  return { widgets, layouts }
}

export type BoardWidget = {
  id: string
  metricId: string
  params: Record<string, string>
  /** Present when metricId === "custom.query" */
  customQuery?: import("@/lib/stats/query-spec").CustomQuerySpec
}

export const CUSTOM_METRIC_ID = "custom.query"

export type BoardLayoutItem = {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxH?: number
}

export type BoardState = {
  widgets: BoardWidget[]
  layouts: BoardLayoutItem[]
}

const STORAGE_PREFIX = "wildenergy.stats.board.v3."

export function loadBoard(tab: StatsTab): BoardState {
  if (typeof window === "undefined") return defaultBoard(tab)
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + tab)
    if (!raw) return defaultBoard(tab)
    const parsed = JSON.parse(raw) as BoardState
    if (!parsed?.widgets?.length || !parsed?.layouts?.length) return defaultBoard(tab)
    return parsed
  } catch {
    return defaultBoard(tab)
  }
}

export function saveBoard(tab: StatsTab, state: BoardState) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_PREFIX + tab, JSON.stringify(state))
}
