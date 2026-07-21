"use client"

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
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { StatsWidget } from "@/components/stats/kpi-card"
import type { NamedCount, RatePoint, TimePoint } from "@/lib/api/stats"
import { formatCurrency } from "@/lib/config"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#0d9488",
  "#ea580c",
  "#7c3aed",
  "#db2777",
  "#2563eb",
]

export function TimeSeriesChart({
  title,
  description,
  data,
  valueLabel = "Value",
  secondaryLabel,
  currency,
}: {
  title: string
  description?: string
  data: TimePoint[]
  valueLabel?: string
  secondaryLabel?: string
  currency?: boolean
}) {
  const empty = !data.some((d) => d.value > 0 || (d.secondary ?? 0) > 0)
  const config: ChartConfig = {
    value: { label: valueLabel, color: "hsl(var(--chart-1))" },
    ...(secondaryLabel
      ? { secondary: { label: secondaryLabel, color: "hsl(var(--chart-2))" } }
      : {}),
  }

  return (
    <StatsWidget title={title} description={description} empty={empty}>
      <ChartContainer config={config} className="h-56 w-full aspect-auto">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={currency ? 56 : 36}
            tickFormatter={(v) => (currency ? `${Math.round(v)}` : String(v))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  currency && name === "value"
                    ? formatCurrency(Number(value))
                    : String(value)
                }
              />
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            fill="var(--color-value)"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          {secondaryLabel ? (
            <Area
              type="monotone"
              dataKey="secondary"
              stroke="var(--color-secondary)"
              fill="var(--color-secondary)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ) : null}
          {secondaryLabel ? <ChartLegend content={<ChartLegendContent />} /> : null}
        </AreaChart>
      </ChartContainer>
    </StatsWidget>
  )
}

export function HorizontalBarChartWidget({
  title,
  description,
  data,
  valueLabel = "Count",
}: {
  title: string
  description?: string
  data: NamedCount[]
  valueLabel?: string
}) {
  const empty = data.length === 0 || data.every((d) => d.value === 0)
  const config: ChartConfig = {
    value: { label: valueLabel, color: "hsl(var(--chart-1))" },
  }
  const chartData = data.slice(0, 12)

  return (
    <StatsWidget title={title} description={description} empty={empty}>
      <ChartContainer config={config} className="h-64 w-full aspect-auto">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 8, right: 12, top: 4, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartContainer>
    </StatsWidget>
  )
}

export function VerticalBarChartWidget({
  title,
  description,
  data,
  valueLabel = "Count",
}: {
  title: string
  description?: string
  data: NamedCount[]
  valueLabel?: string
}) {
  const empty = data.length === 0 || data.every((d) => d.value === 0)
  const config: ChartConfig = {
    value: { label: valueLabel, color: "hsl(var(--chart-2))" },
  }

  return (
    <StatsWidget title={title} description={description} empty={empty}>
      <ChartContainer config={config} className="h-56 w-full aspect-auto">
        <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </StatsWidget>
  )
}

export function PieChartWidget({
  title,
  description,
  data,
}: {
  title: string
  description?: string
  data: NamedCount[]
}) {
  const empty = data.length === 0 || data.every((d) => d.value === 0)
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.name,
      { label: d.name, color: COLORS[i % COLORS.length] },
    ]),
  )

  return (
    <StatsWidget title={title} description={description} empty={empty}>
      <ChartContainer config={config} className="h-56 w-full aspect-auto">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
        </PieChart>
      </ChartContainer>
    </StatsWidget>
  )
}

export function RatesLineChart({
  title,
  description,
  data,
}: {
  title: string
  description?: string
  data: RatePoint[]
}) {
  const empty = !data.some((d) => d.attendance || d.noShow || d.cancel)
  const config: ChartConfig = {
    attendance: { label: "Attendance %", color: "hsl(var(--chart-1))" },
    noShow: { label: "No-show %", color: "hsl(var(--chart-3))" },
    cancel: { label: "Cancel %", color: "hsl(var(--chart-4))" },
  }

  return (
    <StatsWidget title={title} description={description} empty={empty}>
      <ChartContainer config={config} className="h-56 w-full aspect-auto">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} domain={[0, 100]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="attendance" stroke="var(--color-attendance)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="noShow" stroke="var(--color-noShow)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cancel" stroke="var(--color-cancel)" strokeWidth={2} dot={false} />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </StatsWidget>
  )
}
