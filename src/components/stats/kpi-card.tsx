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
  const showDelta = compare && deltaPct !== undefined
  const positive = (deltaPct ?? 0) > 0
  const negative = (deltaPct ?? 0) < 0

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {showDelta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                positive && "text-emerald-600",
                negative && "text-rose-600",
                !positive && !negative && "text-muted-foreground",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : negative ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {deltaPct === null ? "n/a" : `${positive ? "+" : ""}${deltaPct.toFixed(1)}%`}
            </span>
          ) : null}
          {description ? <span>{description}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsWidget({
  title,
  description,
  children,
  className,
  empty,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  empty?: boolean
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex-1">
        {empty ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No data in this period
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
