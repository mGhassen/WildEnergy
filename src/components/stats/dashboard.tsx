"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CalendarCheck,
  CreditCard,
  DollarSign,
  Percent,
  UserCheck,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCard, Widget } from "@/components/stats/kpi-card"
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

function ParamSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function StatsDashboard({
  data,
  compare,
}: {
  data: AdminStatsResponse
  compare: boolean
}) {
  const [revenueMix, setRevenueMix] = useState<"type" | "plan">("plan")
  const [attendanceDim, setAttendanceDim] = useState<"class" | "category" | "trainer">("class")
  const [peakDim, setPeakDim] = useState<"day" | "hour">("day")
  const [volumeMode, setVolumeMode] = useState<"both" | "regs" | "checkins">("both")
  const [subView, setSubView] = useState<"status" | "plans">("status")

  const o = data.overview
  const f = data.finances
  const a = data.attendance
  const avgTicketPaid = f.paidCount > 0 ? o.paidRevenue.value / f.paidCount : 0

  const attendanceBreakdown = useMemo(() => {
    if (attendanceDim === "category") return a.byCategory
    if (attendanceDim === "trainer") return a.byTrainer
    return a.byClass
  }, [attendanceDim, a])

  const revenueBreakdown = revenueMix === "type" ? f.byPaymentType : f.byPlan

  const volumeData = useMemo(() => {
    if (volumeMode === "regs") {
      return a.volumeOverTime.map((p) => ({ ...p, secondary: undefined }))
    }
    if (volumeMode === "checkins") {
      return a.volumeOverTime.map((p) => ({
        date: p.date,
        value: p.secondary ?? 0,
        secondary: undefined,
      }))
    }
    return a.volumeOverTime
  }, [a.volumeOverTime, volumeMode])

  return (
    <div className="space-y-4">
      {/* KPI strip — period-aware, not lifetime dumps */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Period revenue"
          value={formatCurrency(o.paidRevenue.value)}
          deltaPct={o.paidRevenue.deltaPct}
          compare={compare}
          icon={DollarSign}
          description="paid only"
        />
        <KpiCard
          title="Avg ticket"
          value={formatCurrency(avgTicketPaid)}
          icon={CreditCard}
          description={`${f.paidCount} paid payments`}
        />
        <KpiCard
          title="Outstanding"
          value={formatCurrency(o.outstandingAmount)}
          icon={AlertTriangle}
          description={`${formatCurrency(o.overdueAmount)} overdue · ${pct(f.collectionRate)} collected`}
        />
        <KpiCard
          title="Attendance"
          value={pct(o.attendanceRate.value)}
          deltaPct={o.attendanceRate.deltaPct}
          compare={compare}
          icon={Percent}
          description={`${a.totals.attended}/${a.totals.registrations - a.totals.cancelled} non-cancelled`}
        />
        <KpiCard
          title="Fill rate"
          value={pct(o.avgFillRate.value)}
          deltaPct={o.avgFillRate.deltaPct}
          compare={compare}
          icon={CalendarCheck}
          description={`${data.program.capacityWaste} empty seats wasted`}
        />
        <KpiCard
          title="Active book"
          value={`${o.activeMembers}`}
          icon={UserCheck}
          description={`${o.activeSubscriptions} subs · ${o.expiringSoon} expiring ≤14d · +${o.newMembers.value} new`}
        />
      </div>

      {/* Widget canvas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <TimeSeriesChart
          className="lg:col-span-4"
          title="Revenue trend"
          description="Paid amount by period bucket — not lifetime total"
          data={f.revenueOverTime}
          valueLabel="Paid revenue"
          currency
          heightClass="h-64"
        />

        <HorizontalBarChartWidget
          className="lg:col-span-2"
          title="Revenue mix"
          description={revenueMix === "plan" ? "By plan" : "By payment type"}
          actions={
            <ParamSelect
              value={revenueMix}
              onChange={(v) => setRevenueMix(v as "type" | "plan")}
              options={[
                { value: "plan", label: "By plan" },
                { value: "type", label: "By type" },
              ]}
            />
          }
          data={revenueBreakdown}
          valueLabel="Revenue"
          currency
        />

        <RatesLineChart
          className="lg:col-span-3"
          title="Attendance quality"
          description="Attendance / no-show / cancel rates"
          data={a.ratesOverTime}
        />

        <TimeSeriesChart
          className="lg:col-span-3"
          title="Booking volume"
          description={
            volumeMode === "both"
              ? "Registrations vs check-ins"
              : volumeMode === "regs"
                ? "Registrations only"
                : "Check-ins only"
          }
          actions={
            <ParamSelect
              value={volumeMode}
              onChange={(v) => setVolumeMode(v as typeof volumeMode)}
              options={[
                { value: "both", label: "Both" },
                { value: "regs", label: "Registrations" },
                { value: "checkins", label: "Check-ins" },
              ]}
            />
          }
          data={volumeData}
          valueLabel={volumeMode === "checkins" ? "Check-ins" : "Registrations"}
          secondaryLabel={volumeMode === "both" ? "Check-ins" : undefined}
        />

        <HorizontalBarChartWidget
          className="lg:col-span-3"
          title="Who shows up"
          description={`Attendance by ${attendanceDim}`}
          actions={
            <ParamSelect
              value={attendanceDim}
              onChange={(v) => setAttendanceDim(v as typeof attendanceDim)}
              options={[
                { value: "class", label: "By class" },
                { value: "category", label: "By category" },
                { value: "trainer", label: "By trainer" },
              ]}
            />
          }
          data={attendanceBreakdown}
        />

        <VerticalBarChartWidget
          className="lg:col-span-3"
          title="Schedule demand"
          description={peakDim === "day" ? "Courses by day of week" : "Courses by start hour"}
          actions={
            <ParamSelect
              value={peakDim}
              onChange={(v) => setPeakDim(v as typeof peakDim)}
              options={[
                { value: "day", label: "By day" },
                { value: "hour", label: "By hour" },
              ]}
            />
          }
          data={peakDim === "day" ? a.peakDayOfWeek : a.peakHour}
          valueLabel="Courses"
        />

        <HorizontalBarChartWidget
          className="lg:col-span-3"
          title="Class fill rates"
          description="Completed courses — seats used / capacity"
          data={data.program.fillRateByClass.map((r) => ({
            name: r.name,
            value: Math.round(r.fillRate * 10) / 10,
          }))}
          valueLabel="Fill %"
        />

        <VerticalBarChartWidget
          className="lg:col-span-3"
          title="Program health"
          description={`${data.program.completedCourses} completed · ${data.program.cancelledCourses} cancelled · ${data.program.capacityWaste} empty seats`}
          data={data.program.statusBreakdown}
          valueLabel="Courses"
        />

        {subView === "status" ? (
          <PieChartWidget
            className="lg:col-span-3"
            title="Subscriptions"
            description={`${data.subscriptions.depletedActive} active with 0 sessions left`}
            actions={
              <ParamSelect
                value={subView}
                onChange={(v) => setSubView(v as typeof subView)}
                options={[
                  { value: "status", label: "By status" },
                  { value: "plans", label: "By plan" },
                ]}
              />
            }
            data={data.subscriptions.statusMix}
          />
        ) : (
          <Widget
            className="lg:col-span-3"
            title="Subscriptions"
            description={`${data.subscriptions.depletedActive} active with 0 sessions left`}
            actions={
              <ParamSelect
                value={subView}
                onChange={(v) => setSubView(v as typeof subView)}
                options={[
                  { value: "status", label: "By status" },
                  { value: "plans", label: "By plan" },
                ]}
              />
            }
            empty={data.subscriptions.planMix.length === 0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Subs</TableHead>
                  <TableHead className="text-right">Paid in</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.subscriptions.planMix.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Widget>
        )}

        <Widget
          className="lg:col-span-3"
          title="Session burn"
          description="Utilization by group on active subscriptions"
          empty={data.subscriptions.sessionUtilization.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Left</TableHead>
                <TableHead className="text-right">Burn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subscriptions.sessionUtilization.map((g) => (
                <TableRow key={g.groupId}>
                  <TableCell>{g.groupName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g.used}/{g.total}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{g.remaining}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(g.utilization)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Widget>

        <Widget
          className="lg:col-span-3"
          title="Expiring ≤14 days"
          description="Renewal pressure"
          empty={data.subscriptions.expiringSoon.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subscriptions.expiringSoon.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/admin/subscriptions/${row.id}`} className="hover:underline">
                      {row.memberName}
                    </Link>
                  </TableCell>
                  <TableCell>{row.planName}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.daysLeft <= 3 ? "destructive" : "secondary"}>
                      {row.daysLeft}d
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Widget>

        <TimeSeriesChart
          className="lg:col-span-3"
          title="New members"
          description="Joined in period"
          data={data.members.growth}
          valueLabel="New members"
        />

        <PieChartWidget
          className="lg:col-span-3"
          title="Member status"
          data={data.members.statusBreakdown}
        />

        <Widget
          className="lg:col-span-6"
          title="Trainer load"
          description="Courses, unique attendees, attendance & fill in period"
          empty={data.trainers.rows.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trainer</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead className="text-right">Attendees</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
                <TableHead className="text-right">Fill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.trainers.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/admin/trainers/${r.id}`} className="hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.courses}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.uniqueAttendees}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.attendanceRate)}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(r.fillRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Widget>

        <Widget
          className="lg:col-span-3"
          title="Top guest visits"
          description="Admin guest registrations"
          empty={data.members.topGuests.length === 0}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.topGuests.map((g) => (
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
        </Widget>

        <Widget className="lg:col-span-3" title="Cash credit on accounts" description="Member wallet balances">
          <div className="flex h-full flex-col justify-center gap-2 py-6">
            <p className="text-3xl font-semibold tabular-nums">{formatCurrency(f.creditOutstanding)}</p>
            <p className="text-sm text-muted-foreground">
              Discounts given in period: {formatCurrency(f.discountTotal)}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {o.newMembers.value} new members · delta{" "}
              {o.newMembers.deltaPct == null ? "n/a" : `${o.newMembers.deltaPct.toFixed(1)}%`} vs prev
            </div>
          </div>
        </Widget>
      </div>
    </div>
  )
}
