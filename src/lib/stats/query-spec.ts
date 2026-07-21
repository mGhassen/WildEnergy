import { z } from "zod"

export const objectIdSchema = z.enum([
  "members",
  "subscriptions",
  "payments",
  "plans",
  "courses",
  "registrations",
  "checkins",
  "classes",
  "categories",
  "trainers",
])

export const filterOpSchema = z.enum([
  "eq",
  "neq",
  "in",
  "gte",
  "lte",
  "between",
  "is_null",
  "is_not_null",
  "contains",
])

export const aggSchema = z.enum(["count", "sum", "avg", "min", "max", "countDistinct"])

export const vizSchema = z.enum(["kpi", "timeseries", "hbar", "vbar", "pie", "table"])

export const grainSchema = z.enum(["day", "week", "month"])

export const filterClauseSchema = z.object({
  field: z.string().min(1),
  op: filterOpSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]).optional(),
  valueTo: z.union([z.string(), z.number()]).optional(),
})

export const measureClauseSchema = z.object({
  field: z.string().min(1),
  agg: aggSchema,
  as: z.string().min(1),
})

export const dimensionClauseSchema = z.object({
  field: z.string().min(1),
  grain: grainSchema.optional(),
  as: z.string().optional(),
})

export const queryBranchSchema = z.object({
  base: objectIdSchema,
  joins: z.array(z.string()).default([]),
  filters: z.array(filterClauseSchema).default([]),
})

export const customQuerySpecSchema = z
  .object({
    name: z.string().min(1).max(80),
    base: objectIdSchema,
    joins: z.array(z.string()).default([]),
    filters: z.array(filterClauseSchema).default([]),
    measures: z.array(measureClauseSchema).min(1).max(5),
    dimensions: z.array(dimensionClauseSchema).max(3).default([]),
    periodField: z.string().nullable().optional(),
    union: queryBranchSchema.optional(),
    viz: vizSchema,
  })
  .superRefine((q, ctx) => {
    if (q.viz === "kpi" && q.dimensions.length > 0) {
      ctx.addIssue({ code: "custom", message: "KPI requires 0 dimensions", path: ["dimensions"] })
    }
    if (q.viz === "kpi" && q.measures.length !== 1) {
      ctx.addIssue({ code: "custom", message: "KPI requires exactly 1 measure", path: ["measures"] })
    }
    if (q.viz === "timeseries") {
      if (q.dimensions.length !== 1) {
        ctx.addIssue({ code: "custom", message: "Timeseries needs exactly 1 date dimension", path: ["dimensions"] })
      }
      if (q.measures.length !== 1) {
        ctx.addIssue({ code: "custom", message: "Timeseries needs exactly 1 measure", path: ["measures"] })
      }
    }
    if ((q.viz === "pie" || q.viz === "hbar" || q.viz === "vbar") && q.measures.length !== 1) {
      ctx.addIssue({ code: "custom", message: "Chart needs exactly 1 measure", path: ["measures"] })
    }
    if ((q.viz === "pie" || q.viz === "hbar" || q.viz === "vbar") && (q.dimensions.length < 1 || q.dimensions.length > 2)) {
      ctx.addIssue({ code: "custom", message: "Chart needs 1–2 dimensions", path: ["dimensions"] })
    }
  })

export type FilterClause = z.infer<typeof filterClauseSchema>
export type MeasureClause = z.infer<typeof measureClauseSchema>
export type DimensionClause = z.infer<typeof dimensionClauseSchema>
export type QueryBranch = z.infer<typeof queryBranchSchema>
export type CustomQuerySpec = z.infer<typeof customQuerySpecSchema>

export const queryRequestSchema = z.object({
  query: customQuerySpecSchema,
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  compare: z.boolean().optional(),
})

export type QueryRequest = z.infer<typeof queryRequestSchema>

export type QueryResultPayload =
  | {
      kind: "kpi"
      title: string
      value: string
      rawValue: number
      hint?: string
      deltaPct?: number | null
    }
  | {
      kind: "timeseries"
      title: string
      points: Array<{ date: string; value: number; previous?: number }>
      valueLabel: string
      previousLabel?: string
    }
  | {
      kind: "named"
      title: string
      items: Array<{ name: string; value: number }>
      valueLabel?: string
    }
  | {
      kind: "table"
      title: string
      columns: Array<{ key: string; label: string; align?: "left" | "right" }>
      rows: Array<Record<string, string | number>>
    }
