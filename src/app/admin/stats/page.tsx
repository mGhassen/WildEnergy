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
import { WidgetBoard } from "@/components/stats/widget-board"
import { TAB_DEFS, type StatsTab } from "@/components/stats/catalog"
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
  const initialTab = (searchParams.get("tab") as StatsTab) || "overview"
  const [tab, setTab] = useState<StatsTab>(
    TAB_DEFS.some((t) => t.id === initialTab) ? initialTab : "overview",
  )

  useEffect(() => {
    const next = filtersToSearchParams(filters)
    if (tab !== "overview") next.set("tab", tab)
    const qs = next.toString()
    if (qs !== searchParams.toString()) {
      router.replace(`${pathname}?${qs}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tab, pathname, router])

  const onFiltersChange = useCallback((next: StatsFilterState) => {
    setFilters(next)
  }, [])

  const apiFilters = useMemo(() => toApiFilters(filters), [filters])
  const { data, isLoading, isError, error, isFetching } = useAdminStats(apiFilters)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          Customizable widget boards — add metrics, set params on the card, drag & resize
        </p>
      </div>

      <StatsFilterBar
        value={filters}
        onChange={onFiltersChange}
        options={data?.options}
        previousFrom={data?.meta.previousFrom || data?.comparison?.previousFrom}
        previousTo={data?.meta.previousTo || data?.comparison?.previousTo}
      />

      {isLoading && !data ? (
        <StatsSkeleton />
      ) : isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load stats{error?.message ? `: ${error.message}` : ""}
        </div>
      ) : data ? (
        <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as StatsTab)}
          >
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
              {TAB_DEFS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TAB_DEFS.map((t) => (
              <TabsContent key={t.id} value={t.id} className="mt-0">
                {tab === t.id ? (
                  <WidgetBoard tab={t.id} data={data} compare={filters.compare} />
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
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
