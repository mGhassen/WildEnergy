"use client"

import { useMemo, useState } from "react"
import { format, startOfMonth, startOfYear, subDays } from "date-fns"
import { Filter, SlidersHorizontal } from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
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
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
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
    preset: params.get("preset") || "custom",
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

function applyPreset(preset: string): Pick<StatsFilterState, "from" | "to" | "preset"> {
  const today = new Date()
  const to = format(today, "yyyy-MM-dd")
  if (preset === "7d") return { from: format(subDays(today, 6), "yyyy-MM-dd"), to, preset }
  if (preset === "30d") return { from: format(subDays(today, 29), "yyyy-MM-dd"), to, preset }
  if (preset === "90d") return { from: format(subDays(today, 89), "yyyy-MM-dd"), to, preset }
  if (preset === "month") return { from: format(startOfMonth(today), "yyyy-MM-dd"), to, preset }
  if (preset === "year") return { from: format(startOfYear(today), "yyyy-MM-dd"), to, preset }
  return { from: format(subDays(today, 29), "yyyy-MM-dd"), to, preset: "custom" }
}

type Props = {
  value: StatsFilterState
  onChange: (next: StatsFilterState) => void
  options?: StatsFilterOptions
}

function FilterFields({
  value,
  onChange,
  options,
  compact,
}: Props & { compact?: boolean }) {
  const activeFilters = useMemo(() => {
    let n = 0
    if (value.categoryId !== "all") n++
    if (value.trainerId !== "all") n++
    if (value.planId !== "all") n++
    if (value.groupId !== "all") n++
    return n
  }, [value])

  return (
    <div className={compact ? "space-y-4" : "flex flex-wrap items-end gap-3"}>
      <div className="space-y-1.5">
        {!compact && <Label className="text-xs">Range</Label>}
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={value.preset === p.id ? "default" : "outline"}
              onClick={() => {
                if (p.id === "custom") {
                  onChange({ ...value, preset: "custom" })
                  return
                }
                onChange({ ...value, ...applyPreset(p.id) })
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {(value.preset === "custom" || compact) && (
        <div className="flex flex-wrap gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={value.from}
              className="w-[150px]"
              onChange={(e) =>
                onChange({ ...value, from: e.target.value, preset: "custom" })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={value.to}
              className="w-[150px]"
              onChange={(e) =>
                onChange({ ...value, to: e.target.value, preset: "custom" })
              }
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pb-1">
        <Switch
          id="compare-period"
          checked={value.compare}
          onCheckedChange={(checked) => onChange({ ...value, compare: checked })}
        />
        <Label htmlFor="compare-period" className="text-sm">
          Compare previous
        </Label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <Select
          value={value.categoryId}
          onValueChange={(v) => onChange({ ...value, categoryId: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(options?.categories || []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Trainer</Label>
        <Select
          value={value.trainerId}
          onValueChange={(v) => onChange({ ...value, trainerId: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All trainers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trainers</SelectItem>
            {(options?.trainers || []).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Plan</Label>
        <Select
          value={value.planId}
          onValueChange={(v) => onChange({ ...value, planId: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {(options?.plans || []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Group</Label>
        <Select
          value={value.groupId}
          onValueChange={(v) => onChange({ ...value, groupId: v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {(options?.groups || []).map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!compact && activeFilters > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
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
          <Filter className="mr-1 h-3.5 w-3.5" />
          Clear filters ({activeFilters})
        </Button>
      ) : null}
    </div>
  )
}

export function StatsFilterBar(props: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="sticky top-0 z-20 -mx-6 border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="hidden lg:block">
          <FilterFields {...props} />
        </div>
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="flex flex-wrap gap-1">
            {PRESETS.filter((p) => p.id !== "custom").map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={props.value.preset === p.id ? "default" : "outline"}
                onClick={() => props.onChange({ ...props.value, ...applyPreset(p.id) })}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Stats filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterFields {...props} compact />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  )
}
