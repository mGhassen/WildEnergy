"use client"

import { useMemo, useState } from "react"
import {
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
} from "date-fns"
import { Check, ChevronsUpDown, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StatsFilterOptions } from "@/lib/api/stats"

export type StatsFilterState = {
  from: string
  to: string
  compare: boolean
  categoryId: string
  trainerId: string
  planId: string
  groupId: string
  preset: string
}

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "14d", label: "Last 14 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
  { id: "week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "quarter", label: "This quarter" },
  { id: "last_quarter", label: "Last quarter" },
  { id: "year", label: "This year" },
  { id: "last_year", label: "Last year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
] as const

export function defaultStatsFilters(): StatsFilterState {
  const to = format(new Date(), "yyyy-MM-dd")
  const from = format(subDays(new Date(), 29), "yyyy-MM-dd")
  return {
    from,
    to,
    compare: true,
    categoryId: "all",
    trainerId: "all",
    planId: "all",
    groupId: "all",
    preset: "30d",
  }
}

export function filtersFromSearchParams(params: URLSearchParams): StatsFilterState {
  const base = defaultStatsFilters()
  return {
    from: params.get("from") || base.from,
    to: params.get("to") || base.to,
    compare: params.get("compare") !== "0",
    categoryId: params.get("categoryId") || "all",
    trainerId: params.get("trainerId") || "all",
    planId: params.get("planId") || "all",
    groupId: params.get("groupId") || "all",
    preset: params.get("preset") || "30d",
  }
}

export function filtersToSearchParams(f: StatsFilterState): URLSearchParams {
  const params = new URLSearchParams()
  params.set("from", f.from)
  params.set("to", f.to)
  params.set("compare", f.compare ? "1" : "0")
  params.set("preset", f.preset)
  if (f.categoryId !== "all") params.set("categoryId", f.categoryId)
  if (f.trainerId !== "all") params.set("trainerId", f.trainerId)
  if (f.planId !== "all") params.set("planId", f.planId)
  if (f.groupId !== "all") params.set("groupId", f.groupId)
  return params
}

function iso(d: Date) {
  return format(d, "yyyy-MM-dd")
}

function applyPreset(preset: string): Pick<StatsFilterState, "from" | "to" | "preset"> {
  const today = startOfDay(new Date())
  const toToday = iso(today)

  switch (preset) {
    case "today":
      return { from: toToday, to: toToday, preset }
    case "yesterday": {
      const y = subDays(today, 1)
      return { from: iso(y), to: iso(y), preset }
    }
    case "7d":
      return { from: iso(subDays(today, 6)), to: toToday, preset }
    case "14d":
      return { from: iso(subDays(today, 13)), to: toToday, preset }
    case "30d":
      return { from: iso(subDays(today, 29)), to: toToday, preset }
    case "90d":
      return { from: iso(subDays(today, 89)), to: toToday, preset }
    case "6m":
      return { from: iso(subMonths(today, 6)), to: toToday, preset }
    case "12m":
      return { from: iso(subMonths(today, 12)), to: toToday, preset }
    case "week":
      return {
        from: iso(startOfWeek(today, { weekStartsOn: 1 })),
        to: toToday,
        preset,
      }
    case "last_week": {
      const last = subWeeks(today, 1)
      return {
        from: iso(startOfWeek(last, { weekStartsOn: 1 })),
        to: iso(endOfWeek(last, { weekStartsOn: 1 })),
        preset,
      }
    }
    case "month":
      return { from: iso(startOfMonth(today)), to: toToday, preset }
    case "last_month": {
      const last = subMonths(today, 1)
      return {
        from: iso(startOfMonth(last)),
        to: iso(endOfMonth(last)),
        preset,
      }
    }
    case "quarter":
      return { from: iso(startOfQuarter(today)), to: toToday, preset }
    case "last_quarter": {
      const last = subQuarters(today, 1)
      return {
        from: iso(startOfQuarter(last)),
        to: iso(endOfQuarter(last)),
        preset,
      }
    }
    case "year":
      return { from: iso(startOfYear(today)), to: toToday, preset }
    case "last_year": {
      const y = today.getFullYear() - 1
      return {
        from: `${y}-01-01`,
        to: `${y}-12-31`,
        preset,
      }
    }
    case "all":
      return { from: "2020-01-01", to: toToday, preset }
    case "custom":
      return { from: iso(subDays(today, 29)), to: toToday, preset: "custom" }
    default:
      return { from: iso(subDays(today, 29)), to: toToday, preset: "custom" }
  }
}

function activeScopeCount(value: StatsFilterState) {
  return [value.categoryId, value.trainerId, value.planId, value.groupId].filter((v) => v !== "all").length
}

function ScopeFields({
  value,
  onChange,
  options,
}: {
  value: StatsFilterState
  onChange: (next: StatsFilterState) => void
  options?: StatsFilterOptions
}) {
  return (
    <div className="grid gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <Select value={value.categoryId} onValueChange={(v) => onChange({ ...value, categoryId: v })}>
          <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(options?.categories || []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Trainer</Label>
        <Select value={value.trainerId} onValueChange={(v) => onChange({ ...value, trainerId: v })}>
          <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trainers</SelectItem>
            {(options?.trainers || []).map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Plan</Label>
        <Select value={value.planId} onValueChange={(v) => onChange({ ...value, planId: v })}>
          <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {(options?.plans || []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Session group</Label>
        <Select value={value.groupId} onValueChange={(v) => onChange({ ...value, groupId: v })}>
          <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {(options?.groups || []).map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

type Props = {
  value: StatsFilterState
  onChange: (next: StatsFilterState) => void
  options?: StatsFilterOptions
  previousFrom?: string
  previousTo?: string
}

export function StatsFilterBar({ value, onChange, options, previousFrom, previousTo }: Props) {
  const [scopeOpen, setScopeOpen] = useState(false)
  const scopeCount = activeScopeCount(value)
  const presetLabel = PRESETS.find((p) => p.id === value.preset)?.label || "Custom"

  const chips = useMemo(() => {
    const list: Array<{ key: string; label: string; clear: () => void }> = []
    if (value.categoryId !== "all") {
      const name = options?.categories.find((c) => String(c.id) === value.categoryId)?.name || value.categoryId
      list.push({ key: "category", label: `Category: ${name}`, clear: () => onChange({ ...value, categoryId: "all" }) })
    }
    if (value.trainerId !== "all") {
      const name = options?.trainers.find((t) => t.id === value.trainerId)?.name || value.trainerId
      list.push({ key: "trainer", label: `Trainer: ${name}`, clear: () => onChange({ ...value, trainerId: "all" }) })
    }
    if (value.planId !== "all") {
      const name = options?.plans.find((p) => String(p.id) === value.planId)?.name || value.planId
      list.push({ key: "plan", label: `Plan: ${name}`, clear: () => onChange({ ...value, planId: "all" }) })
    }
    if (value.groupId !== "all") {
      const name = options?.groups.find((g) => String(g.id) === value.groupId)?.name || value.groupId
      list.push({ key: "group", label: `Group: ${name}`, clear: () => onChange({ ...value, groupId: "all" }) })
    }
    return list
  }, [value, options, onChange])

  return (
    <div className="sticky top-0 z-20 -mx-2 space-y-3 border-b bg-background/95 px-2 py-3 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 min-w-[140px] justify-between gap-2">
              <span className="truncate">{presetLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-2">
            <div className="grid max-h-[360px] gap-1 overflow-y-auto">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  variant="ghost"
                  size="sm"
                  className={cn("justify-start", value.preset === p.id && "bg-accent")}
                  onClick={() => {
                    if (p.id === "custom") onChange({ ...value, preset: "custom" })
                    else onChange({ ...value, ...applyPreset(p.id) })
                  }}
                >
                  {value.preset === p.id ? <Check className="mr-2 h-3.5 w-3.5" /> : <span className="mr-2 w-3.5" />}
                  {p.label}
                </Button>
              ))}
            </div>
            {value.preset === "custom" ? (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input
                    type="date"
                    value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value, preset: "custom" })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input
                    type="date"
                    value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value, preset: "custom" })}
                  />
                </div>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>

        <div className="hidden text-xs text-muted-foreground sm:block tabular-nums">
          {value.from} → {value.to}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5">
          <Switch
            id="compare-period"
            checked={value.compare}
            onCheckedChange={(checked) => onChange({ ...value, compare: checked })}
          />
          <Label htmlFor="compare-period" className="text-xs cursor-pointer">
            Compare previous period
          </Label>
          {value.compare && previousFrom && previousTo ? (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              vs {previousFrom} → {previousTo}
            </span>
          ) : null}
        </div>

        <div className="flex-1" />

        {/* Desktop scope filters */}
        <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="hidden h-9 gap-2 lg:inline-flex">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Scope
              {scopeCount > 0 ? (
                <Badge variant="secondary" className="h-5 px-1.5">{scopeCount}</Badge>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Scope filters</p>
              {scopeCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() =>
                    onChange({
                      ...value,
                      categoryId: "all",
                      trainerId: "all",
                      planId: "all",
                      groupId: "all",
                    })
                  }
                >
                  Reset
                </Button>
              ) : null}
            </div>
            <ScopeFields value={value} onChange={onChange} options={options} />
          </PopoverContent>
        </Popover>

        {/* Mobile scope */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 lg:hidden">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Scope
              {scopeCount > 0 ? (
                <Badge variant="secondary" className="h-5 px-1.5">{scopeCount}</Badge>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh]">
            <SheetHeader>
              <SheetTitle>Scope filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ScopeFields value={value} onChange={onChange} options={options} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 font-normal">
              {chip.label}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                onClick={chip.clear}
                aria-label={`Clear ${chip.key}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}
