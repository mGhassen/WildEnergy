"use client"

import { useCallback, useEffect, useState } from "react"
import GridLayout, { type Layout } from "react-grid-layout/legacy"
import { useContainerWidth } from "react-grid-layout"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AdminStatsResponse } from "@/lib/api/stats"
import {
  defaultBoard,
  defaultParams,
  loadBoard,
  saveBoard,
  type BoardLayoutItem,
  type BoardState,
  type BoardWidget,
  type MetricDef,
  type StatsTab,
} from "@/components/stats/catalog"
import { WidgetCard } from "@/components/stats/widget-card"
import { AddWidgetDialog } from "@/components/stats/add-widget-dialog"
import "react-grid-layout/css/styles.css"

export function WidgetBoard({
  tab,
  data,
  compare,
}: {
  tab: StatsTab
  data: AdminStatsResponse
  compare: boolean
}) {
  const { width, containerRef, mounted } = useContainerWidth()
  const [board, setBoard] = useState<BoardState>(() => defaultBoard(tab))
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setBoard(loadBoard(tab))
    setHydrated(true)
  }, [tab])

  useEffect(() => {
    if (!hydrated) return
    saveBoard(tab, board)
  }, [board, tab, hydrated])

  const onLayoutChange = useCallback((layout: Layout) => {
    setBoard((prev) => ({
      ...prev,
      layouts: layout.map((l) => {
        const prevItem = prev.layouts.find((p) => p.i === l.i)
        return {
          i: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
          minW: l.minW,
          minH: l.minH,
          maxH: prevItem?.maxH ?? l.maxH,
        }
      }),
    }))
  }, [])

  const addWidget = useCallback((metric: MetricDef) => {
    const id = `${metric.id}__${Date.now().toString(36)}`
    const isKpi = metric.viz === "kpi"
    setBoard((prev) => {
      const maxY = prev.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      const widget: BoardWidget = {
        id,
        metricId: metric.id,
        params: defaultParams(metric),
      }
      const layout: BoardLayoutItem = {
        i: id,
        x: 0,
        y: maxY,
        w: isKpi ? 2 : metric.defaultW,
        h: isKpi ? 2 : metric.defaultH,
        minW: 2,
        minH: 2,
        maxH: isKpi ? 3 : undefined,
      }
      return {
        widgets: [...prev.widgets, widget],
        layouts: [...prev.layouts, layout],
      }
    })
  }, [])

  const removeWidget = useCallback((id: string) => {
    setBoard((prev) => ({
      widgets: prev.widgets.filter((w) => w.id !== id),
      layouts: prev.layouts.filter((l) => l.i !== id),
    }))
  }, [])

  const changeParams = useCallback((id: string, params: Record<string, string>) => {
    setBoard((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === id ? { ...w, params } : w)),
    }))
  }, [])

  const reset = useCallback(() => {
    const next = defaultBoard(tab)
    setBoard(next)
    saveBoard(tab, next)
  }, [tab])

  const layout = board.layouts.map((l) => ({
    ...l,
    minW: l.minW ?? 2,
    minH: l.minH ?? 2,
    maxH: l.maxH,
  }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AddWidgetDialog tab={tab} onAdd={addWidget} />
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset board
        </Button>
        <p className="text-xs text-muted-foreground">
          Drag · resize · params on each card · layout saved per tab
        </p>
      </div>

      <div ref={containerRef} className="min-h-[320px]">
        {board.widgets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">Empty board — add a widget</p>
            <AddWidgetDialog tab={tab} onAdd={addWidget} />
          </div>
        ) : mounted && width > 0 ? (
          <GridLayout
            className="layout"
            layout={layout}
            cols={6}
            rowHeight={72}
            width={width}
            onLayoutChange={onLayoutChange}
            draggableHandle=".drag-handle"
            compactType="vertical"
            margin={[12, 12]}
            containerPadding={[0, 0]}
            isResizable
            isDraggable
          >
            {board.widgets.map((widget) => (
              <div key={widget.id} className="h-full">
                <WidgetCard
                  widget={widget}
                  data={data}
                  compare={compare}
                  onChangeParams={(params) => changeParams(widget.id, params)}
                  onRemove={() => removeWidget(widget.id)}
                />
              </div>
            ))}
          </GridLayout>
        ) : (
          <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
        )}
      </div>
    </div>
  )
}
