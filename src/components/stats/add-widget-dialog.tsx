"use client"

import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  metricsForTab,
  type MetricDef,
  type StatsTab,
} from "@/components/stats/catalog"
import { CustomStatWizard } from "@/components/stats/custom-stat-wizard"
import { customSeedsForTab } from "@/components/stats/custom-seeds"
import type { CustomQuerySpec } from "@/lib/stats/query-spec"
import { cn } from "@/lib/utils"

export function AddWidgetDialog({
  tab,
  from,
  to,
  compare,
  open,
  onOpenChange,
  onAddTemplate,
  onAddCustom,
  trigger = true,
}: {
  tab: StatsTab
  from: string
  to: string
  compare?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTemplate: (metric: MetricDef) => void
  onAddCustom: (query: CustomQuerySpec) => void
  /** When false, only the dialog is rendered (parent owns the open trigger). */
  trigger?: boolean
}) {
  const [mode, setMode] = useState<"templates" | "quick" | "custom">("templates")
  const [q, setQ] = useState("")
  const metrics = useMemo(() => metricsForTab(tab), [tab])
  const seeds = useMemo(() => customSeedsForTab(tab), [tab])

  const grouped = useMemo(() => {
    const filtered = metrics.filter((m) => {
      const hay = `${m.label} ${m.object} ${m.description}`.toLowerCase()
      return hay.includes(q.trim().toLowerCase())
    })
    const map = new Map<string, MetricDef[]>()
    for (const m of filtered) {
      const list = map.get(m.object) || []
      list.push(m)
      map.set(m.object, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [metrics, q])

  const filteredSeeds = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return seeds
    return seeds.filter((s) =>
      `${s.label} ${s.description}`.toLowerCase().includes(needle),
    )
  }, [seeds, q])

  const close = () => {
    onOpenChange(false)
    setQ("")
    setMode("templates")
  }

  return (
    <>
      {trigger && (
        <Button size="sm" className="gap-1.5" onClick={() => onOpenChange(true)}>
          <Plus className="h-4 w-4" />
          Add widget
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v)
          if (!v) {
            setQ("")
            setMode("templates")
          }
        }}
      >
        <DialogContent className={cn("max-w-lg", mode === "custom" && "max-w-xl")}>
          <DialogHeader>
            <DialogTitle>Add a stat widget</DialogTitle>
            <DialogDescription>
              {mode === "templates"
                ? "Pick a ready-made metric for this tab."
                : mode === "quick"
                  ? "One-click custom queries from the semantic layer."
                  : "Guided builder: objects → joins → filters → measure → viz."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 rounded-md bg-muted p-1">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium",
                mode === "templates" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setMode("templates")}
            >
              Templates
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium",
                mode === "quick" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setMode("quick")}
            >
              Quick
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium",
                mode === "custom" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setMode("custom")}
            >
              Custom
            </button>
          </div>

          {mode === "templates" ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search members, payments, courses…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[380px] pr-3">
                <div className="space-y-4">
                  {grouped.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No metrics match</p>
                  ) : (
                    grouped.map(([object, items]) => (
                      <div key={object}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {object}
                        </p>
                        <div className="space-y-1.5">
                          {items.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className="flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent"
                              onClick={() => {
                                onAddTemplate(m)
                                close()
                              }}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{m.label}</p>
                                <p className="line-clamp-3 text-xs text-muted-foreground">
                                  {m.description}
                                </p>
                              </div>
                              <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                                {m.viz}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          ) : mode === "quick" ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search quick queries…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[380px] pr-3">
                <div className="space-y-1.5">
                  {filteredSeeds.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No quick queries match</p>
                  ) : (
                    filteredSeeds.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent"
                        onClick={() => {
                          onAddCustom(s.query)
                          close()
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{s.label}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                          {s.query.viz}
                        </Badge>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <CustomStatWizard
              from={from}
              to={to}
              compare={compare}
              onCancel={() => setMode("templates")}
              onSubmit={(query) => {
                onAddCustom(query)
                close()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
