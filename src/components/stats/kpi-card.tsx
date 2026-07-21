"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type KpiCardProps = {
  title: string
  value: string
  description?: string
  deltaPct?: number | null
  compare?: boolean
  icon?: LucideIcon
  className?: string
}

export function KpiCard({
  title,
  value,
  description,
  deltaPct,
  compare,
  icon: Icon,
  className,
}: KpiCardProps) {
  const showDelta = compare && deltaPct !== undefined && deltaPct !== null
  const positive = (deltaPct ?? 0) > 0.05
  const negative = (deltaPct ?? 0) < -0.05

  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {showDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
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
              {`${positive ? "+" : ""}${(deltaPct as number).toFixed(1)}%`}
              <span className="font-normal text-muted-foreground">vs prev</span>
            </span>
          ) : null}
          {description ? <span>{description}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}

type WidgetProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  empty?: boolean
  emptyLabel?: string
}

export function Widget({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  empty,
  emptyLabel = "No data in this period",
}: WidgetProps) {
  return (
    <Card className={cn("flex flex-col shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description ? (
            <CardDescription className="text-xs">{description}</CardDescription>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn("flex-1 pt-0", contentClassName)}>
        {empty ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

/** @deprecated use Widget */
export const StatsWidget = Widget
