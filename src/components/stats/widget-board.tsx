"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import GridLayout, { type Layout } from "react-grid-layout/legacy"
import { useContainerWidth } from "react-grid-layout"
import type { AdminStatsResponse } from "@/lib/api/stats"
import { statsApi } from "@/lib/api/stats"
import type { CustomQuerySpec } from "@/lib/stats/query-spec"
import {
  CUSTOM_METRIC_ID,
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
const PERSIST_DEBOUNCE_MS = 400

function newWidgetId() {
  return crypto.randomUUID()
}

function layoutForCustom(viz: CustomQuerySpec["viz"]): Pick<BoardLayoutItem, "w" | "h" | "maxH"> {
  if (viz === "kpi") return { w: 2, h: 2, maxH: 3 }
  if (viz === "table") return { w: 4, h: 4 }
  return { w: 3, h: 3 }
}

function sameLayout(a: BoardLayoutItem[], b: Layout): boolean {
  if (a.length !== b.length) return false
  const byId = new Map(a.map((item) => [item.i, item]))
  for (const item of b) {
    const prev = byId.get(item.i)
    if (!prev) return false
    if (
      prev.x !== item.x ||
      prev.y !== item.y ||
      prev.w !== item.w ||
      prev.h !== item.h
    ) {
      return false
    }
  }
  return true
}

function toBoardLayouts(
  layout: Layout,
  prevLayouts: BoardLayoutItem[],
): BoardLayoutItem[] {
  return layout.map((l) => {
    const prevItem = prevLayouts.find((p) => p.i === l.i)
    return {
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h,
      minW: l.minW ?? prevItem?.minW ?? 2,
      minH: l.minH ?? prevItem?.minH ?? 2,
      maxH: prevItem?.maxH ?? l.maxH,
    }
  })
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
  const [board, setBoard] = useState<BoardState | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)
  const boardTabRef = useRef(tab)
  const persistReadyRef = useRef(false)
  const skipNextPersistRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    persistReadyRef.current = false
    boardTabRef.current = tab
    skipNextPersistRef.current = true
    setBoard(null)

    let cancelled = false
    ;(async () => {
      try {
        const remote = await statsApi.getBoard(tab)
        if (cancelled || boardTabRef.current !== tab) return
        skipNextPersistRef.current = true
        setBoard(remote)
        saveBoard(tab, remote)
      } catch {
        if (cancelled || boardTabRef.current !== tab) return
        skipNextPersistRef.current = true
        setBoard(loadBoard(tab))
      } finally {
        if (!cancelled && boardTabRef.current === tab) {
          window.setTimeout(() => {
            if (boardTabRef.current === tab) persistReadyRef.current = true
          }, 0)
        }
      }
    })()

    return () => {
      cancelled = true
      persistReadyRef.current = false
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [tab])

  useEffect(() => {
    if (!board || !persistReadyRef.current) return
    if (boardTabRef.current !== tab) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    saveBoard(tab, board)

    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current)
    const snapshot = board
    saveTimerRef.current = window.setTimeout(() => {
      void statsApi.saveBoard(tab, snapshot).catch(() => {
        // local cache already updated; retry on next change
      })
    }, PERSIST_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [board, tab])

  const applyLayout = useCallback((layout: Layout) => {
    if (!layout.length) return
    setBoard((prev) => {
      if (!prev) return prev
      if (sameLayout(prev.layouts, layout)) return prev
      if (layout.length < prev.layouts.length) return prev
      return {
        ...prev,
        layouts: toBoardLayouts(layout, prev.layouts),
      }
    })
  }, [])

  const onLayoutChange = useCallback(
    (layout: Layout) => {
      if (!persistReadyRef.current) return
      applyLayout(layout)
    },
    [applyLayout],
  )

  const addTemplate = useCallback((metric: MetricDef) => {
    const id = newWidgetId()
    const isKpi = metric.viz === "kpi"
    setBoard((prev) => {
      if (!prev) return prev
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
    const id = newWidgetId()
    const size = layoutForCustom(query.viz)
    setBoard((prev) => {
      if (!prev) return prev
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
    setBoard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id === id ? { ...w, customQuery: query } : w,
        ),
      }
    })
  }, [])

  const removeWidget = useCallback((id: string) => {
    setBoard((prev) => {
      if (!prev) return prev
      return {
        widgets: prev.widgets.filter((w) => w.id !== id),
        layouts: prev.layouts.filter((l) => l.i !== id),
      }
    })
  }, [])

  const changeParams = useCallback((id: string, params: Record<string, string>) => {
    setBoard((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, params } : w)),
      }
    })
  }, [])

  if (!board) {
    return (
      <div ref={containerRef} className="min-h-[320px]">
        <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
      </div>
    )
  }

  const layout = board.layouts.map((l) => ({
    ...l,
    minW: l.minW ?? 2,
    minH: l.minH ?? 2,
    maxH: l.maxH,
  }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {board.widgets.length > 0 && (
          <AddWidgetDialog
            tab={tab}
            from={from}
            to={to}
            compare={compare}
            open={isAddWidgetOpen}
            onOpenChange={setIsAddWidgetOpen}
            onAddTemplate={addTemplate}
            onAddCustom={addCustom}
          />
        )}
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
              open={isAddWidgetOpen}
              onOpenChange={setIsAddWidgetOpen}
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
            onDragStop={(next) => {
              setShowGrid(false)
              applyLayout(next)
            }}
            onResizeStart={() => setShowGrid(true)}
            onResizeStop={(next) => {
              setShowGrid(false)
              applyLayout(next)
            }}
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
                  onAddCustom={addCustom}
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
