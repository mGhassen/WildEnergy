"use client"

import Link from "next/link"
import {
  Users,
  UserCheck,
  DollarSign,
  Percent,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCard, StatsWidget } from "@/components/stats/kpi-card"
import {
  HorizontalBarChartWidget,
  PieChartWidget,
  RatesLineChart,
  TimeSeriesChart,
  VerticalBarChartWidget,
} from "@/components/stats/charts"
import { formatCurrency } from "@/lib/config"
import type { AdminStatsResponse } from "@/lib/api/stats"

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

export function OverviewSection({
  data,
  compare,
}: {
  data: AdminStatsResponse
  compare: boolean
}) {
  const o = data.overview
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        title="Active members"
        value={String(o.activeMembers)}
        description={`${o.totalMembers} total`}
        icon={UserCheck}
      />
      <KpiCard
        title="New members"
        value={String(o.newMembers.value)}
        deltaPct={o.newMembers.deltaPct}
        compare={compare}
        icon={Users}
        description="in range"
      />
      <KpiCard
        title="Paid revenue"
        value={formatCurrency(o.paidRevenue.value)}
        deltaPct={o.paidRevenue.deltaPct}
        compare={compare}
        icon={DollarSign}
      />
      <KpiCard
        title="Outstanding"
        value={formatCurrency(o.outstandingAmount)}
        description={`${formatCurrency(o.overdueAmount)} overdue`}
        icon={AlertTriangle}
      />
      <KpiCard
        title="Attendance"
        value={pct(o.attendanceRate.value)}
        deltaPct={o.attendanceRate.deltaPct}
        compare={compare}
        icon={Percent}
      />
      <KpiCard
        title="Fill rate"
        value={pct(o.avgFillRate.value)}
        deltaPct={o.avgFillRate.deltaPct}
        compare={compare}
        icon={CalendarCheck}
        description={`${o.activeSubscriptions} active subs · ${o.expiringSoon} expiring`}
      />
    </div>
  )
}

export function MembersSection({ data }: { data: AdminStatsResponse }) {
  const m = data.members
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TimeSeriesChart
        title="Member growth"
        description="New members over time"
        data={m.growth}
        valueLabel="New members"
      />
      <PieChartWidget title="Member status" data={m.statusBreakdown} />
      <PieChartWidget title="Linked vs unlinked accounts" data={m.linkedVsUnlinked} />
      <HorizontalBarChartWidget
        title="Top professions"
        description="From member profiles"
        data={m.professions}
      />
      <StatsWidget
        title="Top guest visitors"
        description="Members registered as guest by admin"
        className="lg:col-span-2"
        empty={m.topGuests.length === 0}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">Guest visits</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {m.topGuests.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <Link href={`/admin/members/${g.id}`} className="hover:underline">
                    {g.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{g.guestCount}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StatsWidget>
    </div>
  )
}

export function FinancesSection({ data }: { data: AdminStatsResponse }) {
  const f = data.finances
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Collection rate" value={pct(f.collectionRate)} icon={Percent} />
        <KpiCard title="ARPU" value={formatCurrency(f.arpu)} description="per active member" icon={DollarSign} />
        <KpiCard title="Discounts" value={formatCurrency(f.discountTotal)} icon={CreditCard} />
        <KpiCard
          title="Credit outstanding"
          value={formatCurrency(f.creditOutstanding)}
          description={`${f.outstandingCount} pending · ${f.overdueCount} overdue`}
          icon={AlertTriangle}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          title="Revenue over time"
          description="Paid payments only"
          data={f.revenueOverTime}
          valueLabel="Revenue"
          currency
        />
        <PieChartWidget title="Revenue by payment type" data={f.byPaymentType} />
        <HorizontalBarChartWidget title="Revenue by plan" data={f.byPlan} valueLabel="Revenue" />
        <VerticalBarChartWidget
          title="Payment volume"
          data={[
            { name: "Paid", value: f.paidCount },
            { name: "Pending", value: f.pendingCount },
            { name: "Outstanding", value: f.outstandingCount },
            { name: "Overdue", value: f.overdueCount },
          ]}
        />
      </div>
    </div>
  )
}

export function AttendanceSection({ data }: { data: AdminStatsResponse }) {
  const a = data.attendance
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard title="Registrations" value={String(a.totals.registrations)} />
        <KpiCard title="Attended" value={String(a.totals.attended)} />
        <KpiCard title="Absent" value={String(a.totals.absent)} />
        <KpiCard title="Cancelled" value={String(a.totals.cancelled)} />
        <KpiCard title="Check-ins" value={String(a.totals.checkins)} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RatesLineChart
          title="Attendance rates"
          description="% of registrations by status"
          data={a.ratesOverTime}
        />
        <TimeSeriesChart
          title="Volume"
          description="Registrations vs check-ins"
          data={a.volumeOverTime}
          valueLabel="Registrations"
          secondaryLabel="Check-ins"
        />
        <HorizontalBarChartWidget title="Attendance by class" data={a.byClass} />
        <HorizontalBarChartWidget title="Attendance by category" data={a.byCategory} />
        <HorizontalBarChartWidget title="Attendance by trainer" data={a.byTrainer} />
        <VerticalBarChartWidget title="Peak day of week" data={a.peakDayOfWeek} valueLabel="Courses" />
        <VerticalBarChartWidget title="Peak hours" data={a.peakHour} valueLabel="Courses" />
      </div>
    </div>
  )
}

export function ProgramSection({ data }: { data: AdminStatsResponse }) {
  const p = data.program
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Completed" value={String(p.completedCourses)} />
        <KpiCard title="Scheduled" value={String(p.scheduledCourses)} />
        <KpiCard title="Cancelled" value={String(p.cancelledCourses)} />
        <KpiCard title="Empty seats" value={String(p.capacityWaste)} description="on completed courses" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarChartWidget
          title="Fill rate by class"
          description="% of capacity filled"
          data={p.fillRateByClass.map((r) => ({
            name: r.name,
            value: Math.round(r.fillRate * 10) / 10,
          }))}
          valueLabel="Fill %"
        />
        <PieChartWidget title="Course status" data={p.statusBreakdown} />
        <StatsWidget
          title="Class capacity detail"
          className="lg:col-span-2"
          empty={p.fillRateByClass.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Seats used</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Fill rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.fillRateByClass.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.seats}</TableCell>
                  <TableCell className="text-right">{r.capacity}</TableCell>
                  <TableCell className="text-right">{pct(r.fillRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StatsWidget>
      </div>
    </div>
  )
}

export function SubscriptionsSection({ data }: { data: AdminStatsResponse }) {
  const s = data.subscriptions
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          title="Active subscriptions"
          value={String(s.statusMix.find((x) => x.name === "active")?.value ?? 0)}
        />
        <KpiCard title="Expiring ≤14d" value={String(s.expiringSoon.length)} />
        <KpiCard
          title="Depleted sessions"
          value={String(s.depletedActive)}
          description="active sub, 0 sessions left"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartWidget title="Subscription status" data={s.statusMix} />
        <HorizontalBarChartWidget
          title="Plan mix"
          data={s.planMix.map((p) => ({ name: p.name, value: p.count }))}
        />
        <StatsWidget
          title="Session utilization by group"
          empty={s.sessionUtilization.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.sessionUtilization.map((g) => (
                <TableRow key={g.groupId}>
                  <TableCell>{g.groupName}</TableCell>
                  <TableCell className="text-right">{g.used}/{g.total}</TableCell>
                  <TableCell className="text-right">{g.remaining}</TableCell>
                  <TableCell className="text-right">{pct(g.utilization)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StatsWidget>
        <StatsWidget
          title="Expiring soon"
          description="Active subscriptions ending within 14 days"
          empty={s.expiringSoon.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.expiringSoon.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.memberName}</TableCell>
                  <TableCell>{row.planName}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.daysLeft <= 3 ? "destructive" : "secondary"}>
                      {row.daysLeft}d · {row.endDate}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StatsWidget>
        <StatsWidget title="Plan revenue mix" className="lg:col-span-2" empty={s.planMix.length === 0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Subscriptions</TableHead>
                <TableHead className="text-right">Paid revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.planMix.map((p) => (
                <TableRow key={p.name}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">{p.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StatsWidget>
      </div>
    </div>
  )
}

export function TrainersSection({ data }: { data: AdminStatsResponse }) {
  const rows = data.trainers.rows
  return (
    <div className="space-y-6">
      <HorizontalBarChartWidget
        title="Courses taught"
        data={rows.map((r) => ({ name: r.name, value: r.courses }))}
      />
      <StatsWidget title="Trainer performance" empty={rows.length === 0}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trainer</TableHead>
              <TableHead className="text-right">Courses</TableHead>
              <TableHead className="text-right">Unique attendees</TableHead>
              <TableHead className="text-right">Attendance</TableHead>
              <TableHead className="text-right">Fill rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/admin/trainers/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                </TableCell>
                <TableCell className="text-right">{r.courses}</TableCell>
                <TableCell className="text-right">{r.uniqueAttendees}</TableCell>
                <TableCell className="text-right">{pct(r.attendanceRate)}</TableCell>
                <TableCell className="text-right">{pct(r.fillRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StatsWidget>
    </div>
  )
}

export function AcquisitionSection({ data }: { data: AdminStatsResponse }) {
  const a = data.acquisition
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Pending accounts"
          value={String(a.pendingAccounts)}
          description="Awaiting approval"
          icon={Users}
        />
        <div className="md:col-span-2 flex items-center">
          <Link
            href="/admin/accounts"
            className="text-sm text-primary hover:underline"
          >
            Review pending accounts →
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartWidget title="Discovery sources" data={a.discoverySources} />
        <HorizontalBarChartWidget
          title="Onboarding funnel"
          description="Members who completed each step"
          data={a.funnel}
        />
      </div>
    </div>
  )
}
