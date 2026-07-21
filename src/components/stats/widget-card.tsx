"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { GripVertical, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/config"
import type { AdminStatsResponse } from "@/lib/api/stats"
import {
  getMetric,
  type BoardWidget,
  type MetricPayload,
} from "@/components/stats/catalog"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#0d9488",
  "#ea580c",
]

function Delta({ value, compare }: { value?: number | null; compare?: boolean }) {
  if (!compare || value === undefined || value === null) return null
  const positive = value > 0.05
  const negative = value < -0.05
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive && "text-emerald-600",
        negative && "text-rose-600",
      )}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : negative ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {`${positive ? "+" : ""}${value.toFixed(1)}%`}
      <span className="font-normal text-muted-foreground">vs prev</span>
    </span>
  )
}

function Empty() {
  return (
    <div className="flex h-full min-h-[100px] items-center justify-center text-sm text-muted-foreground">
      No data in this period
    </div>
  )
}

function TimeseriesChart({ payload }: { payload: Extract<MetricPayload, { kind: "timeseries" }> }) {
  const hasPrevious = Boolean(payload.previousLabel && payload.points.some((p) => p.previous != null))
  const empty = !payload.points.some(
    (p) => p.value > 0 || (p.secondary ?? 0) > 0 || (p.previous ?? 0) > 0,
  )
  if (empty) return <Empty />
  const config: ChartConfig = {
    value: { label: payload.valueLabel, color: "hsl(var(--chart-1))" },
    ...(payload.secondaryLabel
      ? { secondary: { label: payload.secondaryLabel, color: "hsl(var(--chart-2))" } }
      : {}),
    ...(hasPrevious
      ? { previous: { label: payload.previousLabel!, color: "hsl(var(--muted-foreground))" } }
      : {}),
  }
  return (
    <ChartContainer config={config} className="h-full w-full aspect-auto min-h-[120px]">
      <AreaChart data={payload.points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={10}
          width={payload.currency ? 44 : 28}
          tickFormatter={(v) => (payload.currency ? `${Math.round(Number(v))}` : String(v))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(v) => (payload.currency ? formatCurrency(Number(v)) : String(v))}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          fill="var(--color-value)"
          fillOpacity={0.18}
          strokeWidth={2}
        />
        {payload.secondaryLabel ? (
          <Area
            type="monotone"
            dataKey="secondary"
            stroke="var(--color-secondary)"
            fill="var(--color-secondary)"
            fillOpacity={0.12}
            strokeWidth={2}
          />
        ) : null}
        {hasPrevious ? (
          <Line
            type="monotone"
            dataKey="previous"
            stroke="var(--color-previous)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        ) : null}
        {payload.secondaryLabel || hasPrevious ? (
          <ChartLegend content={<ChartLegendContent />} />
        ) : null}
      </AreaChart>
    </ChartContainer>
  )
}

function RatesChart({ payload }: { payload: Extract<MetricPayload, { kind: "rates" }> }) {
  const empty = !payload.points.some((p) => p.attendance || p.noShow || p.cancel)
  if (empty) return <Empty />
  const showPrev = Boolean(payload.showPrevious)
  const config: ChartConfig = {
    attendance: { label: "Attendance %", color: "hsl(var(--chart-1))" },
    noShow: { label: "No-show %", color: "hsl(var(--chart-3))" },
    cancel: { label: "Cancel %", color: "hsl(var(--chart-4))" },
    ...(showPrev
      ? {
          previousAttendance: {
            label: "Prev attendance %",
            color: "hsl(var(--muted-foreground))",
          },
        }
      : {}),
  }
  return (
    <ChartContainer config={config} className="h-full w-full aspect-auto min-h-[120px]">
      <LineChart data={payload.points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={10} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="attendance" stroke="var(--color-attendance)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="noShow" stroke="var(--color-noShow)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cancel" stroke="var(--color-cancel)" strokeWidth={2} dot={false} />
        {showPrev ? (
          <Line
            type="monotone"
            dataKey="previousAttendance"
            stroke="var(--color-previousAttendance)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        ) : null}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}

function NamedChart({
  payload,
  viz,
}: {
  payload: Extract<MetricPayload, { kind: "named" }>
  viz: "hbar" | "vbar" | "pie"
}) {
  const empty = payload.items.length === 0 || payload.items.every((i) => i.value === 0)
  if (empty) return <Empty />
  const config: ChartConfig = {
    value: { label: payload.valueLabel || "Value", color: "hsl(var(--chart-1))" },
    ...Object.fromEntries(
      payload.items.map((d, i) => [d.name, { label: d.name, color: COLORS[i % COLORS.length] }]),
    ),
  }

  if (viz === "pie") {
    return (
      <ChartContainer config={config} className="h-full w-full aspect-auto min-h-[120px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie data={payload.items} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
            {payload.items.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
    )
  }

  if (viz === "hbar") {
    return (
      <ChartContainer config={config} className="h-full w-full aspect-auto min-h-[120px]">
        <BarChart
          data={payload.items.slice(0, 12)}
          layout="vertical"
          margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            tickFormatter={(v) => (payload.currency ? `${Math.round(Number(v))}` : String(v))}
          />
          <YAxis type="category" dataKey="name" width={88} tickLine={false} axisLine={false} fontSize={10} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(v) => (payload.currency ? formatCurrency(Number(v)) : String(v))}
              />
            }
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-full w-full aspect-auto min-h-[120px]">
      <BarChart data={payload.items} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

function TableBodyView({ payload }: { payload: Extract<MetricPayload, { kind: "table" }> }) {
  if (payload.rows.length === 0) return <Empty />
  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {payload.columns.map((c) => (
              <TableHead key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payload.rows.map((row, i) => (
            <TableRow key={i}>
              {payload.columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={cn("tabular-nums", c.align === "right" && "text-right")}
                >
                  {row[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function WidgetCard({
  widget,
  data,
  compare,
  onChangeParams,
  onRemove,
}: {
  widget: BoardWidget
  data: AdminStatsResponse
  compare: boolean
  onChangeParams: (params: Record<string, string>) => void
  onRemove: () => void
}) {
  const metric = getMetric(widget.metricId)
  const payload = useMemo(() => {
    if (!metric) return null
    return metric.resolve(data, widget.params)
  }, [metric, data, widget.params])

  if (!metric || !payload) {
    return (
      <Card className="flex h-full flex-col shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Unknown widget</CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="destructive" onClick={onRemove}>
            Remove
          </Button>
        </CardContent>
      </Card>
    )
  }

  const title = "title" in payload ? payload.title : metric.label
  const isKpi = metric.viz === "kpi"

  return (
    <Card className="group flex h-full flex-col overflow-hidden shadow-none">
      <CardHeader className="flex flex-row items-start gap-2 space-y-0 border-b px-3 py-2">
        <button
          type="button"
          className="drag-handle mt-0.5 cursor-grab opacity-0 text-muted-foreground transition-opacity active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
          aria-label="Drag widget"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-sm font-semibold">{title}</CardTitle>
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {metric.object}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {(metric.params || []).map((p) => (
            <Select
              key={p.key}
              value={widget.params[p.key] ?? p.defaultValue}
              onValueChange={(v) => onChangeParams({ ...widget.params, [p.key]: v })}
            >
              <SelectTrigger className="h-7 w-[110px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {p.options.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 text-muted-foreground transition-opacity hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
            onClick={onRemove}
            aria-label="Remove widget"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-3">
        {isKpi && payload.kind === "kpi" ? (
          <div className="flex h-full flex-col justify-between gap-2">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                  {payload.value}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Delta value={payload.deltaPct} compare={compare} />
                  {payload.hint ? <span className="truncate">{payload.hint}</span> : null}
                </div>
              </div>
            </div>
            <p className="line-clamp-3 text-[11px] leading-snug text-muted-foreground">
              {metric.description}
            </p>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <p className="shrink-0 text-[11px] leading-snug text-muted-foreground line-clamp-2">
              {metric.description}
            </p>
            <div className="min-h-0 flex-1">
              {payload.kind === "timeseries" ? (
                <TimeseriesChart payload={payload} />
              ) : payload.kind === "rates" ? (
                <RatesChart payload={payload} />
              ) : payload.kind === "named" ? (
                <NamedChart payload={payload} viz={metric.viz as "hbar" | "vbar" | "pie"} />
              ) : payload.kind === "table" ? (
                <TableBodyView payload={payload} />
              ) : payload.kind === "kpi" ? (
                <div className="flex h-full flex-col justify-center gap-1">
                  <div className="text-3xl font-semibold tracking-tight tabular-nums">{payload.value}</div>
                  <Delta value={payload.deltaPct} compare={compare} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
