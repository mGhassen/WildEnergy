"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatsSkeleton } from "@/components/skeletons"
import {
  StatsFilterBar,
  filtersFromSearchParams,
  filtersToSearchParams,
  type StatsFilterState,
} from "@/components/stats/stats-filter-bar"
import {
  OverviewSection,
  MembersSection,
  FinancesSection,
  AttendanceSection,
  ProgramSection,
  SubscriptionsSection,
  TrainersSection,
  AcquisitionSection,
} from "@/components/stats/sections"
import {
  PieChartWidget,
  TimeSeriesChart,
  HorizontalBarChartWidget,
} from "@/components/stats/charts"
import { useAdminStats } from "@/hooks/useAdminStats"
import type { StatsFilters } from "@/lib/api/stats"

function toApiFilters(f: StatsFilterState): StatsFilters {
  return {
    from: f.from,
    to: f.to,
    compare: f.compare,
    categoryId: f.categoryId !== "all" ? f.categoryId : undefined,
    trainerId: f.trainerId !== "all" ? f.trainerId : undefined,
    planId: f.planId !== "all" ? f.planId : undefined,
    groupId: f.groupId !== "all" ? f.groupId : undefined,
  }
}

function AdminStatsPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<StatsFilterState>(() =>
    filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
  )
  const [tab, setTab] = useState(searchParams.get("tab") || "overview")

  useEffect(() => {
    const next = filtersToSearchParams(filters)
    if (tab && tab !== "overview") next.set("tab", tab)
    const qs = next.toString()
    if (qs !== searchParams.toString()) {
      router.replace(`${pathname}?${qs}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync outward only when filters/tab change
  }, [filters, tab, pathname, router])

  const onFiltersChange = useCallback((next: StatsFilterState) => {
    setFilters(next)
  }, [])

  const apiFilters = useMemo(() => toApiFilters(filters), [filters])
  const { data, isLoading, isError, error, isFetching } = useAdminStats(apiFilters)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Stats</h1>
        <p className="text-muted-foreground">
          Expert analytics across members, finances, attendance, program, and more
        </p>
      </div>

      <StatsFilterBar
        value={filters}
        onChange={onFiltersChange}
        options={data?.options}
      />

      {isLoading && !data ? (
        <StatsSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load stats{error?.message ? `: ${error.message}` : ""}
        </div>
      ) : data ? (
        <div className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="finances">Finances</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="program">Program</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="trainers">Trainers</TabsTrigger>
              <TabsTrigger value="acquisition">Acquisition</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewSection data={data} compare={filters.compare} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TimeSeriesChart
                  title="Revenue over time"
                  description="Paid payments only"
                  data={data.finances.revenueOverTime}
                  valueLabel="Revenue"
                  currency
                />
                <TimeSeriesChart
                  title="Member growth"
                  data={data.members.growth}
                  valueLabel="New members"
                />
                <PieChartWidget
                  title="Subscription status"
                  data={data.subscriptions.statusMix}
                />
                <HorizontalBarChartWidget
                  title="Attendance by class"
                  data={data.attendance.byClass}
                />
              </div>
            </TabsContent>

            <TabsContent value="members">
              <MembersSection data={data} />
            </TabsContent>
            <TabsContent value="finances">
              <FinancesSection data={data} />
            </TabsContent>
            <TabsContent value="attendance">
              <AttendanceSection data={data} />
            </TabsContent>
            <TabsContent value="program">
              <ProgramSection data={data} />
            </TabsContent>
            <TabsContent value="subscriptions">
              <SubscriptionsSection data={data} />
            </TabsContent>
            <TabsContent value="trainers">
              <TrainersSection data={data} />
            </TabsContent>
            <TabsContent value="acquisition">
              <AcquisitionSection data={data} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}

export default function AdminStatsPage() {
  return (
    <Suspense fallback={<div className="p-6"><StatsSkeleton /></div>}>
      <AdminStatsPageInner />
    </Suspense>
  )
}
