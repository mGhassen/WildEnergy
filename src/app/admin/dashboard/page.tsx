"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  QrCode,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardSkeleton } from "@/components/skeletons";
import { useAdminDashboardStats } from "@/hooks/useAdmin";
import { useAdminDashboardTasks } from "@/hooks/useAdminDashboardTasks";
import { useCheckins } from "@/hooks/useCheckins";
import { useCourses } from "@/hooks/useCourse";
import { formatCurrency } from "@/lib/config";
import { formatDate, formatDateTime, formatTime, toDateKey } from "@/lib/date";
import { formatTrainerDisplayName } from "@/lib/format-trainer-name";
import { cn } from "@/lib/utils";

function localTodayKey() {
  return toDateKey(new Date())!;
}

function addDaysKey(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d)!;
}

function courseFillPct(course: { current_participants?: number; max_participants?: number }) {
  const max = course.max_participants || 0;
  if (max <= 0) return 0;
  return Math.min(100, Math.round(((course.current_participants || 0) / max) * 100));
}

function fillTone(pct: number) {
  if (pct >= 95) return "text-destructive";
  if (pct >= 75) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function courseStatusBadge(status: string) {
  switch (status) {
    case "in_progress":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Live</Badge>;
    case "completed":
      return <Badge variant="secondary">Done</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">Scheduled</Badge>;
  }
}

function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] || "?"}${last?.[0] || ""}`.toUpperCase();
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  href,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
}) {
  const inner = (
    <Card className={cn(href && "transition-colors hover:border-primary/40 hover:bg-accent/30")}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function OpsTab() {
  const [dayOffset, setDayOffset] = useState(0);
  const { data: tasks, isLoading: tasksLoading } = useAdminDashboardTasks();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: recentCheckins = [] } = useCheckins();

  const targetDate = addDaysKey(localTodayKey(), dayOffset);

  const dayCourses = useMemo(() => {
    return (courses as any[])
      .filter((c) => toDateKey(c.course_date || c.courseDate) === targetDate)
      .filter((c) => c.status !== "cancelled")
      .sort((a, b) => String(a.start_time || a.startTime).localeCompare(String(b.start_time || b.startTime)));
  }, [courses, targetDate]);

  const nextUp = useMemo(() => {
    if (dayOffset !== 0) return null;
    const now = new Date();
    const upcoming = dayCourses.filter((c) => {
      const start = new Date(`${toDateKey(c.course_date)}T${c.start_time}`);
      const end = new Date(`${toDateKey(c.course_date)}T${c.end_time}`);
      return end.getTime() >= now.getTime() - 15 * 60 * 1000;
    });
    return upcoming[0] ?? null;
  }, [dayCourses, dayOffset]);

  const recentCheckinsList = useMemo(() => {
    return (Array.isArray(recentCheckins) ? recentCheckins : [])
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.checkinTime || b.checkin_time).getTime() -
          new Date(a.checkinTime || a.checkin_time).getTime(),
      )
      .slice(0, 6);
  }, [recentCheckins]);

  const pendingCount = tasks?.pendingAccounts?.count ?? 0;
  const checkSoonCount = tasks?.coursesNeedingCheck?.count ?? 0;
  const actionCount = pendingCount + checkSoonCount;

  if (tasksLoading || coursesLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Pulse strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/15">
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
              <p className="text-lg font-semibold tabular-nums">{actionCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {dayOffset === 0 ? "Courses today" : "Courses tomorrow"}
              </p>
              <p className="text-lg font-semibold tabular-nums">{dayCourses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15">
              <Zap className="h-4 w-4 text-sky-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Next up</p>
              <p className="truncate text-sm font-semibold">
                {nextUp
                  ? `${formatTime(nextUp.start_time)} · ${nextUp.class?.name || "Class"}`
                  : dayOffset === 0
                    ? "Nothing upcoming"
                    : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action queue */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cn(pendingCount > 0 && "border-orange-300/60 dark:border-orange-800")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <CardTitle className="text-base">Accounts to approve</CardTitle>
              </div>
              <Badge variant={pendingCount > 0 ? "default" : "secondary"}>{pendingCount}</Badge>
            </div>
            <CardDescription>Pending registrations waiting for admin action</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingCount > 0 ? (
              <>
                <div className="max-h-44 space-y-2 overflow-y-auto">
                  {(tasks?.pendingAccounts?.accounts ?? []).slice(0, 5).map((account: any) => (
                    <Link
                      key={account.account_id}
                      href={`/admin/accounts/${account.account_id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-medium text-orange-700 dark:text-orange-300">
                          {initials(account.first_name, account.last_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {account.first_name || "Unknown"} {account.last_name || ""}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(account.created_at)}
                      </span>
                    </Link>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/accounts">
                    Open accounts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Inbox clear</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(checkSoonCount > 0 && "border-sky-300/60 dark:border-sky-800")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-600" />
                <CardTitle className="text-base">Check-in window</CardTitle>
              </div>
              <Badge variant={checkSoonCount > 0 ? "default" : "secondary"}>{checkSoonCount}</Badge>
            </div>
            <CardDescription>Courses starting soon or recently overdue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checkSoonCount > 0 ? (
              <>
                <div className="max-h-44 space-y-2 overflow-y-auto">
                  {(tasks?.coursesNeedingCheck?.courses ?? []).slice(0, 5).map((course: any) => (
                    <Link
                      key={course.id}
                      href={`/admin/courses/${course.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{course.class?.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatTrainerDisplayName(course.trainer)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium tabular-nums">{formatTime(course.start_time)}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {course.current_participants}/{course.max_participants}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/checkins">
                    Open check-ins
                    <QrCode className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-500" />
                <p className="text-sm text-muted-foreground">No check-ins due right now</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Day schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  {dayOffset === 0 ? "Today’s schedule" : "Tomorrow’s schedule"}
                </CardTitle>
                <CardDescription>{formatDate(targetDate)}</CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-lg border p-1">
                <Button
                  type="button"
                  variant={dayOffset === 0 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setDayOffset(0)}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant={dayOffset === 1 ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setDayOffset(1)}
                >
                  Tomorrow
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dayCourses.length > 0 ? (
              <div className="space-y-2">
                {dayCourses.map((course: any) => {
                  const pct = courseFillPct(course);
                  const categoryName =
                    course.class?.category?.name ||
                    (typeof course.class?.category === "string" ? course.class.category : null);
                  const categoryColor = course.class?.category?.color;

                  return (
                    <Link
                      key={course.id}
                      href={`/admin/courses/${course.id}`}
                      className="block rounded-xl border p-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
                            style={{
                              backgroundColor: categoryColor || "hsl(var(--primary))",
                            }}
                          >
                            {(categoryName || course.class?.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="truncate font-medium">{course.class?.name || "Class"}</h4>
                              {courseStatusBadge(course.status)}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {formatTrainerDisplayName(course.trainer)}
                              {categoryName ? ` · ${categoryName}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums">
                            {formatTime(course.start_time)} – {formatTime(course.end_time)}
                          </p>
                          <p className={cn("text-xs tabular-nums", fillTone(pct))}>
                            {course.current_participants || 0}/{course.max_participants || 0} booked
                          </p>
                        </div>
                      </div>
                      <Progress value={pct} className="mt-3 h-1.5" />
                    </Link>
                  );
                })}
                <Button asChild variant="ghost" size="sm" className="mt-1 w-full">
                  <Link href="/admin/agenda">
                    Open full agenda
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No courses on this day</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Generate sessions from schedules or open the agenda to plan the day.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/admin/agenda">Agenda</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/schedules">Schedules</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent check-ins + shortcuts */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent check-ins</CardTitle>
                  <CardDescription>Latest attendance activity</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/checkins">All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentCheckinsList.length > 0 ? (
                <div className="space-y-2">
                  {recentCheckinsList.map((checkin: any) => {
                    const first = checkin.member?.firstName || checkin.member?.first_name;
                    const last = checkin.member?.lastName || checkin.member?.last_name;
                    const className =
                      checkin.class?.name ||
                      checkin.registration?.course?.class?.name ||
                      "Class";
                    return (
                      <div
                        key={checkin.id}
                        className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {initials(first, last)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {first} {last}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{className}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDateTime(checkin.checkinTime || checkin.checkin_time)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No recent check-ins</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Jump into day-to-day work</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { href: "/admin/agenda", label: "Agenda", icon: Calendar },
                { href: "/admin/checkins", label: "Check-ins", icon: QrCode },
                { href: "/admin/registrations", label: "Registrations", icon: UserCheck },
                { href: "/admin/members", label: "Members", icon: Users },
                { href: "/admin/courses", label: "Courses", icon: Dumbbell },
                { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
              ].map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="outline"
                  className="h-auto justify-start gap-2 px-3 py-3"
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useAdminDashboardStats();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();

  const weekKeys = useMemo(() => {
    const start = localTodayKey();
    return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
  }, []);

  const weekSeries = useMemo(() => {
    return weekKeys.map((key) => {
      const dayCourses = (courses as any[]).filter(
        (c) => toDateKey(c.course_date || c.courseDate) === key && c.status !== "cancelled",
      );
      const booked = dayCourses.reduce((s, c) => s + (c.current_participants || 0), 0);
      const capacity = dayCourses.reduce((s, c) => s + (c.max_participants || 0), 0);
      return {
        key,
        label: formatDate(key),
        short: new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }),
        count: dayCourses.length,
        booked,
        capacity,
        pct: capacity > 0 ? Math.round((booked / capacity) * 100) : 0,
      };
    });
  }, [courses, weekKeys]);

  const maxWeekCount = Math.max(1, ...weekSeries.map((d) => d.count));

  if (isLoading || coursesLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Members"
          value={stats?.totalMembers ?? 0}
          hint={`${stats?.totalUsers ?? 0} accounts`}
          icon={Users}
          href="/admin/members"
        />
        <KpiCard
          title="Active subscriptions"
          value={stats?.activeSubscriptions ?? 0}
          hint={`${stats?.pendingSubscriptions ?? 0} pending payment`}
          icon={CreditCard}
          href="/admin/subscriptions"
        />
        <KpiCard
          title="Revenue (month)"
          value={formatCurrency(stats?.revenueThisMonth ?? 0)}
          hint={`${stats?.paymentsThisMonth ?? 0} paid · ${formatCurrency(stats?.totalRevenue ?? 0)} all-time`}
          icon={Wallet}
          href="/admin/payments"
        />
        <KpiCard
          title="Check-ins today"
          value={stats?.checkinsToday ?? 0}
          hint={`${stats?.totalCheckins ?? 0} all-time`}
          icon={UserCheck}
          href="/admin/checkins"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Trainers"
          value={stats?.totalTrainers ?? 0}
          icon={Dumbbell}
          href="/admin/trainers"
        />
        <KpiCard
          title="Class templates"
          value={stats?.totalClasses ?? 0}
          icon={LayoutDashboard}
          href="/admin/classes"
        />
        <KpiCard
          title="Courses today"
          value={stats?.coursesToday ?? 0}
          hint={`${stats?.bookedSeatsToday ?? 0}/${stats?.capacitySeatsToday ?? 0} seats`}
          icon={Calendar}
          href="/admin/agenda"
        />
        <KpiCard
          title="Occupancy today"
          value={`${stats?.occupancyToday ?? 0}%`}
          hint="Booked vs capacity"
          icon={TrendingUp}
          href="/admin/stats"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next 7 days</CardTitle>
            <CardDescription>Course volume and seat fill</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-36 items-end gap-2">
              {weekSeries.map((day) => (
                <div key={day.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{day.count}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-primary/80 transition-all"
                      style={{ height: `${Math.max(8, (day.count / maxWeekCount) * 100)}%` }}
                      title={`${day.label}: ${day.count} courses`}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{day.short}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2.5 border-t pt-4">
              {weekSeries.map((day) => (
                <div key={`${day.key}-fill`} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">
                  <span className="text-xs text-muted-foreground">{day.short}</span>
                  <Progress value={day.pct} className="h-1.5" />
                  <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                    {day.capacity > 0 ? `${day.pct}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business snapshot</CardTitle>
            <CardDescription>High-level health at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid revenue</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats?.totalPayments ?? 0} confirmed payments
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Active memberships",
                  value: stats?.activeSubscriptions ?? 0,
                  href: "/admin/subscriptions",
                },
                {
                  label: "Awaiting payment",
                  value: stats?.pendingSubscriptions ?? 0,
                  href: "/admin/subscriptions",
                },
                {
                  label: "Today occupancy",
                  value: `${stats?.occupancyToday ?? 0}%`,
                  href: "/admin/agenda",
                },
              ].map((row) => (
                <Link
                  key={row.label}
                  href={row.href}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent"
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{row.value}</span>
                </Link>
              ))}
            </div>

            <Button asChild className="w-full">
              <Link href="/admin/stats">
                Open analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Run the floor today, or review the business at a glance.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(localTodayKey())}</p>
      </div>

      <Tabs defaultValue="ops" className="space-y-6">
        <TabsList className="h-auto w-full justify-start gap-1 sm:w-auto">
          <TabsTrigger value="ops" className="gap-2 px-4">
            <Zap className="h-3.5 w-3.5" />
            Today
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2 px-4">
            <TrendingUp className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ops" className="mt-0 focus-visible:ring-0">
          <OpsTab />
        </TabsContent>
        <TabsContent value="overview" className="mt-0 focus-visible:ring-0">
          <OverviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
