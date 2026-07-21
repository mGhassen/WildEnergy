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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  metricsForTab,
  type MetricDef,
  type StatsTab,
} from "@/components/stats/catalog"
import { cn } from "@/lib/utils"

export function AddWidgetDialog({
  tab,
  onAdd,
}: {
  tab: StatsTab
  onAdd: (metric: MetricDef) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const metrics = useMemo(() => metricsForTab(tab), [tab])

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a stat widget</DialogTitle>
          <DialogDescription>
            Pick a metric from studio objects. Configure parameters on the card after adding.
          </DialogDescription>
        </DialogHeader>
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
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent",
                        )}
                        onClick={() => {
                          onAdd(m)
                          setOpen(false)
                          setQ("")
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-3">{m.description}</p>
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
      </DialogContent>
    </Dialog>
  )
}
