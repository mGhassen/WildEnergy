"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { StatsSkeleton } from "@/components/skeletons"
import {
  StatsFilterBar,
  filtersFromSearchParams,
  filtersToSearchParams,
  type StatsFilterState,
} from "@/components/stats/stats-filter-bar"
import { StatsDashboard } from "@/components/stats/dashboard"
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

  useEffect(() => {
    const qs = filtersToSearchParams(filters).toString()
    if (qs !== searchParams.toString()) {
      router.replace(`${pathname}?${qs}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pathname, router])

  const onFiltersChange = useCallback((next: StatsFilterState) => {
    setFilters(next)
  }, [])

  const apiFilters = useMemo(() => toApiFilters(filters), [filters])
  const { data, isLoading, isError, error, isFetching } = useAdminStats(apiFilters)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
          <p className="text-sm text-muted-foreground">
            Studio operations — period revenue, attendance, capacity, sessions
          </p>
        </div>
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
        <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
          <StatsDashboard data={data} compare={filters.compare} />
        </div>
      ) : null}
    </div>
  )
}

export default function AdminStatsPage() {
  return (
    <Suspense fallback={<div className="p-2"><StatsSkeleton /></div>}>
      <AdminStatsPageInner />
    </Suspense>
  )
}
