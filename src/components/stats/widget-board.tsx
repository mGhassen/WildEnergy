"use client"

import { useCallback, useEffect, useState } from "react"
import GridLayout, { type Layout } from "react-grid-layout/legacy"
import { useContainerWidth } from "react-grid-layout"
import type { AdminStatsResponse } from "@/lib/api/stats"
import type { CustomQuerySpec } from "@/lib/stats/query-spec"
import {
  CUSTOM_METRIC_ID,
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
import { cn } from "@/lib/utils"
import "react-grid-layout/css/styles.css"

const COLS = 6
const ROW_HEIGHT = 72
const MARGIN: [number, number] = [12, 12]

function layoutForCustom(viz: CustomQuerySpec["viz"]): Pick<BoardLayoutItem, "w" | "h" | "maxH"> {
  if (viz === "kpi") return { w: 2, h: 2, maxH: 3 }
  if (viz === "table") return { w: 4, h: 4 }
  return { w: 3, h: 3 }
}

export function WidgetBoard({
  tab,
  data,
  compare,
  from,
  to,
}: {
  tab: StatsTab
  data: AdminStatsResponse
  compare: boolean
  from: string
  to: string
}) {
  const { width, containerRef, mounted } = useContainerWidth()
  const [board, setBoard] = useState<BoardState>(() => defaultBoard(tab))
  const [hydrated, setHydrated] = useState(false)
  const [showGrid, setShowGrid] = useState(false)

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

  const addTemplate = useCallback((metric: MetricDef) => {
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

  const addCustom = useCallback((query: CustomQuerySpec) => {
    const id = `${CUSTOM_METRIC_ID}__${Date.now().toString(36)}`
    const size = layoutForCustom(query.viz)
    setBoard((prev) => {
      const maxY = prev.layouts.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      const widget: BoardWidget = {
        id,
        metricId: CUSTOM_METRIC_ID,
        params: {},
        customQuery: query,
      }
      const layout: BoardLayoutItem = {
        i: id,
        x: 0,
        y: maxY,
        w: size.w,
        h: size.h,
        minW: 2,
        minH: 2,
        maxH: size.maxH,
      }
      return {
        widgets: [...prev.widgets, widget],
        layouts: [...prev.layouts, layout],
      }
    })
  }, [])

  const updateCustom = useCallback((id: string, query: CustomQuerySpec) => {
    setBoard((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === id ? { ...w, customQuery: query } : w,
      ),
    }))
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

  const layout = board.layouts.map((l) => ({
    ...l,
    minW: l.minW ?? 2,
    minH: l.minH ?? 2,
    maxH: l.maxH,
  }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <AddWidgetDialog
          tab={tab}
          from={from}
          to={to}
          compare={compare}
          onAddTemplate={addTemplate}
          onAddCustom={addCustom}
        />
      </div>

      <div ref={containerRef} className="min-h-[320px]">
        {board.widgets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">Empty board — add a widget</p>
            <AddWidgetDialog
              tab={tab}
              from={from}
              to={to}
              compare={compare}
              onAddTemplate={addTemplate}
              onAddCustom={addCustom}
            />
          </div>
        ) : mounted && width > 0 ? (
          <GridLayout
            className={cn("layout", showGrid && "stats-board-dragging")}
            layout={layout}
            cols={COLS}
            rowHeight={ROW_HEIGHT}
            width={width}
            onLayoutChange={onLayoutChange}
            onDragStart={() => setShowGrid(true)}
            onDragStop={() => setShowGrid(false)}
            onResizeStart={() => setShowGrid(true)}
            onResizeStop={() => setShowGrid(false)}
            draggableHandle=".drag-handle"
            compactType="vertical"
            margin={MARGIN}
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
                  from={from}
                  to={to}
                  onChangeParams={(params) => changeParams(widget.id, params)}
                  onUpdateCustom={(query) => updateCustom(widget.id, query)}
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
