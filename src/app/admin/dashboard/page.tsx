"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  CreditCard,
  Minus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardSkeleton } from "@/components/skeletons";
import { useAdminDashboardStats } from "@/hooks/useAdmin";
import { useAdminDashboardTasks } from "@/hooks/useAdminDashboardTasks";
import { useCourses } from "@/hooks/useCourse";
import { formatCurrency } from "@/lib/config";
import { formatDate, formatTime, toDateKey } from "@/lib/date";
import { formatTrainerDisplayName } from "@/lib/format-trainer-name";
import { cn } from "@/lib/utils";

function todayKey() {
  return toDateKey(new Date())!;
}

function addDaysKey(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d)!;
}

type CourseUrgency = "live" | "checkin" | "soon" | "done" | "full" | "quiet";

function getCourseUrgency(course: any, now: Date, viewingToday: boolean): CourseUrgency {
  if (course.status === "completed") return "done";
  if (course.status === "in_progress") return "live";

  const date = toDateKey(course.course_date || course.courseDate)!;
  const start = new Date(`${date}T${course.start_time || course.startTime}`);
  const end = new Date(`${date}T${course.end_time || course.endTime}`);
  const max = course.max_participants || 0;
  const booked = course.current_participants || 0;
  const full = max > 0 && booked >= max;

  if (!viewingToday) return full ? "full" : "quiet";

  if (now > end) return "done";
  if (now >= start && now <= end) return "live";

  const mins = (start.getTime() - now.getTime()) / 60000;
  if (mins <= 60 && mins >= -120) return "checkin";
  if (mins <= 180) return "soon";
  return full ? "full" : "quiet";
}

const URGENCY_META: Record<
  CourseUrgency,
  { label: string; className: string; rail: string }
> = {
  live: {
    label: "Live",
    className: "bg-emerald-600 text-white border-transparent",
    rail: "bg-emerald-500",
  },
  checkin: {
    label: "Check-in",
    className: "bg-sky-600 text-white border-transparent",
    rail: "bg-sky-500",
  },
  soon: {
    label: "Soon",
    className: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-200",
    rail: "bg-amber-400",
  },
  done: {
    label: "Done",
    className: "bg-muted text-muted-foreground",
    rail: "bg-muted-foreground/30",
  },
  full: {
    label: "Full",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    rail: "bg-destructive/70",
  },
  quiet: {
    label: "Open",
    className: "bg-background text-muted-foreground",
    rail: "bg-border",
  },
};

function Delta({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> flat
      </span>
    );
  }
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function OpsTab() {
  const [dayOffset, setDayOffset] = useState(0);
  const { data: tasks, isLoading: tasksLoading } = useAdminDashboardTasks();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();

  const targetDate = addDaysKey(todayKey(), dayOffset);
  const viewingToday = dayOffset === 0;

  const dayCourses = useMemo(() => {
    const now = new Date();
    return (courses as any[])
      .filter((c) => toDateKey(c.course_date || c.courseDate) === targetDate)
      .filter((c) => c.status !== "cancelled")
      .sort((a, b) =>
        String(a.start_time || a.startTime).localeCompare(String(b.start_time || b.startTime)),
      )
      .map((c) => ({
        ...c,
        urgency: getCourseUrgency(c, now, viewingToday),
      }));
  }, [courses, targetDate, viewingToday]);

  const pending = tasks?.pendingAccounts;
  const pendingCount = pending?.count ?? 0;
  const liveCount = dayCourses.filter((c) => c.urgency === "live").length;
  const checkinCount = dayCourses.filter((c) => c.urgency === "checkin").length;
  const booked = dayCourses.reduce((s, c) => s + (c.current_participants || 0), 0);
  const capacity = dayCourses.reduce((s, c) => s + (c.max_participants || 0), 0);

  if (tasksLoading || coursesLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-5">
      {pendingCount > 0 && (
        <Link
          href="/admin/accounts"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 transition-colors hover:bg-amber-500/15"
        >
          <div className="flex min-w-0 items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {pendingCount} account{pendingCount === 1 ? "" : "s"} waiting for approval
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {(pending?.accounts ?? [])
                  .slice(0, 3)
                  .map((a: any) => `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email)
                  .join(" · ")}
                {pendingCount > 3 ? ` · +${pendingCount - 3}` : ""}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-muted/30 px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Floor schedule</h2>
              <Badge variant="outline" className="font-normal tabular-nums">
                {dayCourses.length} session{dayCourses.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(targetDate)}
              {capacity > 0 ? ` · ${booked}/${capacity} seats` : ""}
              {viewingToday && liveCount > 0 ? ` · ${liveCount} live` : ""}
              {viewingToday && checkinCount > 0 ? ` · ${checkinCount} in check-in` : ""}
            </p>
          </div>
          <div className="flex rounded-lg border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setDayOffset(0)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                dayOffset === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDayOffset(1)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                dayOffset === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {dayCourses.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <CalendarDays className="mb-3 h-9 w-9 text-muted-foreground/40" />
            <p className="text-sm font-medium">Nothing on the board</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              No dated courses for this day. Generate from schedules or open the agenda.
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm">
                <Link href="/admin/agenda">Agenda</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/schedules">Schedules</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {dayCourses.map((course: any) => {
              const meta = URGENCY_META[course.urgency as CourseUrgency];
              const category = course.class?.category;
              const categoryName = category?.name || (typeof category === "string" ? category : null);
              const max = course.max_participants || 0;
              const bookedSeats = course.current_participants || 0;
              const pct = max > 0 ? Math.min(100, Math.round((bookedSeats / max) * 100)) : 0;

              return (
                <li key={course.id}>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="group flex gap-0 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex w-[4.75rem] shrink-0 flex-col items-end gap-1 py-4 pl-4 pr-3 sm:w-24">
                      <span className="text-sm font-semibold tabular-nums leading-none">
                        {formatTime(course.start_time || course.startTime)}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {formatTime(course.end_time || course.endTime)}
                      </span>
                    </div>

                    <div className="relative flex w-4 shrink-0 justify-center">
                      <div className="absolute inset-y-0 w-px bg-border" />
                      <div
                        className={cn(
                          "relative z-[1] mt-5 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                          meta.rail,
                        )}
                      />
                    </div>

                    <div className="min-w-0 flex-1 py-3.5 pr-4 sm:pr-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold group-hover:text-primary">
                              {course.class?.name || "Class"}
                            </h3>
                            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", meta.className)}>
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {formatTrainerDisplayName(course.trainer)}
                            {categoryName ? ` · ${categoryName}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium tabular-nums">
                            {bookedSeats}
                            <span className="text-muted-foreground">/{max || "—"}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">booked</p>
                        </div>
                      </div>

                      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 95 ? "bg-destructive" : pct >= 75 ? "bg-amber-500" : "bg-primary",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {(course.urgency === "live" || course.urgency === "checkin") && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                            <CircleDot className="h-3 w-3" />
                            Open course to run check-in
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2.5 sm:px-5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Check-in (±1h)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Soon
            </span>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link href="/admin/agenda">
              Full agenda
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useAdminDashboardStats();

  if (isLoading) return <DashboardSkeleton />;
  if (!data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Failed to load overview
      </div>
    );
  }

  const cash = data.cash ?? {};
  const membership = data.membership ?? {};
  const capacity = data.capacity ?? {};
  const attendance = data.attendance ?? {};
  const expiring = data.expiring ?? [];
  const byDay = capacity.byDay ?? [];
  const maxCourses = Math.max(1, ...byDay.map((d: any) => d.courses || 0));

  return (
    <div className="space-y-5">
      {/* Cash pulse — month only */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                This month
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {formatCurrency(cash.revenueThisMonth ?? 0)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Delta value={cash.revenueDeltaPct ?? 0} />
                <span className="text-xs text-muted-foreground">
                  vs last month ({formatCurrency(cash.revenuePrevMonth ?? 0)})
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">
                {cash.paymentsThisMonth ?? 0}
              </span>{" "}
              paid transactions
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/payments">Payments</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/admin/subscriptions"
            className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <Users className="mb-3 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums">{membership.active ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active plans</p>
          </Link>
          <Link
            href="/admin/subscriptions"
            className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <CreditCard className="mb-3 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums">{membership.pendingPayment ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting payment</p>
          </Link>
          <Link
            href="/admin/members"
            className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <UserPlus className="mb-3 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums">{membership.newThisMonth ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">New members</p>
          </Link>
          <div className="rounded-2xl border bg-card p-4">
            <CheckCircle2 className="mb-3 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums">{attendance.checkinsThisWeek ?? 0}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground">Check-ins / 7d</p>
              <Delta value={attendance.checkinsDeltaPct ?? 0} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Capacity heat */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Seat fill · next 7 days</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {capacity.weekOccupancyPct ?? 0}% overall · {capacity.weekBooked ?? 0}/
                {capacity.weekCapacity ?? 0} seats · {capacity.weekCourses ?? 0} sessions
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href="/admin/stats">Analytics</Link>
            </Button>
          </div>

          <div className="mt-5 flex h-28 items-end gap-1.5 sm:gap-2">
            {byDay.map((day: any) => {
              const height = Math.max(6, ((day.courses || 0) / maxCourses) * 100);
              const fill = day.occupancyPct || 0;
              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="relative w-full overflow-hidden rounded-t-md bg-muted"
                      style={{ height: `${height}%` }}
                      title={`${formatDate(day.date)}: ${day.courses} courses, ${fill}% full`}
                    >
                      <div
                        className="absolute inset-x-0 bottom-0 bg-primary/80"
                        style={{ height: `${Math.max(fill, day.courses ? 8 : 0)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                      weekday: "narrow",
                    })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-2 border-t pt-4">
            {byDay.map((day: any) => (
              <div
                key={`${day.date}-row`}
                className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-2 text-xs"
              >
                <span className="text-muted-foreground">
                  {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </span>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      (day.occupancyPct || 0) >= 90
                        ? "bg-destructive"
                        : (day.occupancyPct || 0) >= 70
                          ? "bg-amber-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${day.occupancyPct || 0}%` }}
                  />
                </div>
                <span className="text-right tabular-nums text-muted-foreground">
                  {day.capacity > 0 ? `${day.occupancyPct}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Renewal risk */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Renewal risk</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {membership.expiringSoon ?? 0} active plan
                {(membership.expiringSoon ?? 0) === 1 ? "" : "s"} ending within 7 days
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                (membership.expiringSoon ?? 0) > 0 &&
                  "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
              )}
            >
              {membership.expiringSoon ?? 0}
            </Badge>
          </div>

          {expiring.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {expiring.map((row: any) => (
                <li key={row.id}>
                  <Link
                    href={
                      row.memberId
                        ? `/admin/members/${row.memberId}`
                        : `/admin/subscriptions/${row.id}`
                    }
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.memberName}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.planName}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-amber-700 dark:text-amber-300">
                      {formatDate(row.endDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-8 flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="mb-2 h-7 w-7 text-emerald-500" />
              <p className="text-sm text-muted-foreground">No renewals due this week</p>
            </div>
          )}

          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link href="/admin/subscriptions">
              Manage subscriptions
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Floor ops and business pulse — nothing else.</p>
      </div>

      <Tabs defaultValue="ops" className="space-y-5">
        <TabsList className="grid h-10 w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="ops" className="px-5">
            Today
          </TabsTrigger>
          <TabsTrigger value="overview" className="px-5">
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
