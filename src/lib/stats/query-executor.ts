import { format, parseISO, startOfWeek, startOfMonth } from "date-fns"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  alignPreviousOntoCurrent,
  inRange,
  kpi,
  num,
  parseRange,
  previousRange,
  profileName,
  type DateRange,
} from "@/lib/stats/aggregations"
import {
  defaultPeriodField,
  getEdge,
  getField,
  getObject,
  parseFieldRef,
  type ObjectId,
} from "@/lib/stats/semantic"
import type {
  CustomQuerySpec,
  DimensionClause,
  FilterClause,
  MeasureClause,
  QueryBranch,
  QueryResultPayload,
} from "@/lib/stats/query-spec"
import { formatCurrency } from "@/lib/config"

type RowBag = Record<string, any>
type JoinedRow = Partial<Record<ObjectId, RowBag | null>>

const TABLE_SELECT: Record<ObjectId, string> = {
  members: "id, account_id, profile_id, credit, status, guest_count, created_at",
  subscriptions: "*",
  payments: "*",
  plans: "id, name, price, duration_days, is_active",
  courses: "*",
  registrations: "*",
  checkins: "*",
  classes: "id, name, category_id, duration, max_capacity, is_active",
  categories: "id, name, is_active",
  trainers: "id, account_id, profile_id, status, specialization",
}

async function loadTables(
  sb: SupabaseClient,
  needed: ObjectId[],
): Promise<Record<ObjectId, RowBag[]>> {
  const profilesRes = await sb.from("profiles").select("id, first_name, last_name")
  const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]))

  const out = {} as Record<ObjectId, RowBag[]>
  await Promise.all(
    needed.map(async (id) => {
      const obj = getObject(id)!
      const { data } = await sb.from(obj.table).select(TABLE_SELECT[id])
      let rows = (data || []) as RowBag[]
      if (id === "members" || id === "trainers") {
        rows = rows.map((r) => ({
          ...r,
          _name: profileName(profilesById.get(r.profile_id)),
        }))
      }
      out[id] = rows
    }),
  )
  return out
}

function indexBy(rows: RowBag[], key: string): Map<string, RowBag[]> {
  const map = new Map<string, RowBag[]>()
  for (const r of rows) {
    const k = String(r[key] ?? "")
    if (!k) continue
    const list = map.get(k) || []
    list.push(r)
    map.set(k, list)
  }
  return map
}

function applyJoins(
  base: ObjectId,
  joinIds: string[],
  tables: Record<ObjectId, RowBag[]>,
): JoinedRow[] {
  let rows: JoinedRow[] = (tables[base] || []).map((r) => ({ [base]: r }))
  const included = new Set<ObjectId>([base])

  // Apply joins in order; skip if neither side is included yet (caller should order)
  const pending = [...joinIds]
  let guard = 0
  while (pending.length && guard < 20) {
    guard++
    let progress = false
    for (let i = 0; i < pending.length; i++) {
      const edge = getEdge(pending[i])
      if (!edge) {
        pending.splice(i, 1)
        i--
        continue
      }
      const hasFrom = included.has(edge.from)
      const hasTo = included.has(edge.to)
      if (!hasFrom && !hasTo) continue

      const attach: ObjectId = hasFrom ? edge.to : edge.from
      const pivot: ObjectId = hasFrom ? edge.from : edge.to
      const pivotKey = hasFrom ? edge.fromKey : edge.toKey
      const attachKey = hasFrom ? edge.toKey : edge.fromKey
      const attachIndex = indexBy(tables[attach] || [], attachKey)

      const next: JoinedRow[] = []
      for (const row of rows) {
        const pivotRow = row[pivot]
        const key = pivotRow ? String(pivotRow[pivotKey] ?? "") : ""
        const matches = key ? attachIndex.get(key) || [] : []
        if (matches.length === 0) {
          next.push({ ...row, [attach]: null })
        } else {
          for (const m of matches) next.push({ ...row, [attach]: m })
        }
      }
      rows = next
      included.add(attach)
      pending.splice(i, 1)
      i--
      progress = true
    }
    if (!progress) break
  }
  return rows
}

function readField(row: JoinedRow, ref: string): unknown {
  if (ref.endsWith(".__count")) return 1
  const parsed = parseFieldRef(ref)
  if (!parsed) return null
  const objRow = row[parsed.object]
  if (!objRow) return null
  const field = getObject(parsed.object)?.fields.find((f) => f.id === parsed.fieldId)
  if (!field) return null
  return objRow[field.column]
}

function asDateStr(v: unknown): string | null {
  if (v == null || v === "") return null
  const s = String(v)
  return s.slice(0, 10)
}

function matchFilter(row: JoinedRow, f: FilterClause): boolean {
  const raw = readField(row, f.field)
  switch (f.op) {
    case "is_null":
      return raw == null || raw === ""
    case "is_not_null":
      return raw != null && raw !== ""
    case "eq":
      return String(raw) === String(f.value)
    case "neq":
      return String(raw) !== String(f.value)
    case "in": {
      const arr = Array.isArray(f.value) ? f.value : String(f.value ?? "").split(",")
      return arr.map(String).includes(String(raw))
    }
    case "gte":
      if (getField(f.field)?.type === "date") {
        const d = asDateStr(raw)
        return !!d && d >= String(f.value)
      }
      return num(raw) >= num(f.value)
    case "lte":
      if (getField(f.field)?.type === "date") {
        const d = asDateStr(raw)
        return !!d && d <= String(f.value)
      }
      return num(raw) <= num(f.value)
    case "between": {
      if (getField(f.field)?.type === "date") {
        const d = asDateStr(raw)
        return !!d && d >= String(f.value) && d <= String(f.valueTo)
      }
      return num(raw) >= num(f.value) && num(raw) <= num(f.valueTo)
    }
    case "contains":
      return String(raw ?? "")
        .toLowerCase()
        .includes(String(f.value ?? "").toLowerCase())
    default:
      return true
  }
}

function applyFilters(rows: JoinedRow[], filters: FilterClause[]): JoinedRow[] {
  return rows.filter((r) => filters.every((f) => matchFilter(r, f)))
}

function applyPeriod(
  rows: JoinedRow[],
  periodField: string | null | undefined,
  range: DateRange,
): JoinedRow[] {
  if (!periodField) return rows
  return rows.filter((r) => inRange(asDateStr(readField(r, periodField)), range))
}

function grainKey(dateStr: string, grain: "day" | "week" | "month" | undefined): string {
  const d = parseISO(dateStr.slice(0, 10))
  if (grain === "week") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd")
  if (grain === "month") return format(startOfMonth(d), "yyyy-MM")
  return format(d, "yyyy-MM-dd")
}

function dimValue(row: JoinedRow, dim: DimensionClause): string {
  const raw = readField(row, dim.field)
  const field = getField(dim.field)
  if (field?.type === "date") {
    const d = asDateStr(raw)
    if (!d) return "(empty)"
    return grainKey(d, dim.grain)
  }
  if (raw == null || raw === "") return "(empty)"
  return String(raw)
}

function aggregate(rows: JoinedRow[], measure: MeasureClause): number {
  if (measure.agg === "count" || measure.field.endsWith(".__count")) {
    return rows.length
  }
  const values = rows.map((r) => readField(r, measure.field)).filter((v) => v != null && v !== "")
  if (measure.agg === "countDistinct") {
    return new Set(values.map(String)).size
  }
  const nums = values.map(num)
  if (nums.length === 0) return 0
  if (measure.agg === "sum") return nums.reduce((a, b) => a + b, 0)
  if (measure.agg === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length
  if (measure.agg === "min") return Math.min(...nums)
  if (measure.agg === "max") return Math.max(...nums)
  return 0
}

function groupAggregate(
  rows: JoinedRow[],
  dimensions: DimensionClause[],
  measures: MeasureClause[],
): Array<Record<string, string | number>> {
  if (dimensions.length === 0) {
    const out: Record<string, string | number> = {}
    for (const m of measures) out[m.as] = aggregate(rows, m)
    return [out]
  }

  const buckets = new Map<string, JoinedRow[]>()
  for (const row of rows) {
    const keyParts = dimensions.map((d) => dimValue(row, d))
    const key = keyParts.join("\u0001")
    const list = buckets.get(key) || []
    list.push(row)
    buckets.set(key, list)
  }

  const result: Array<Record<string, string | number>> = []
  for (const [key, bucket] of buckets) {
    const parts = key.split("\u0001")
    const out: Record<string, string | number> = {}
    dimensions.forEach((d, i) => {
      out[d.as || d.field] = parts[i]
    })
    for (const m of measures) out[m.as] = aggregate(bucket, m)
    result.push(out)
  }
  return result
}

function buildBranchRows(
  branch: QueryBranch,
  tables: Record<ObjectId, RowBag[]>,
  periodField: string | null | undefined,
  range: DateRange,
): JoinedRow[] {
  let rows = applyJoins(branch.base, branch.joins, tables)
  rows = applyPeriod(rows, periodField, range)
  rows = applyFilters(rows, branch.filters)
  return rows
}

function formatMeasureValue(value: number, measure: MeasureClause): string {
  const field = getField(measure.field)
  if (field?.column === "amount" || field?.column === "price" || field?.column === "discount" || field?.column === "credit") {
    return formatCurrency(value)
  }
  if (measure.agg === "avg") return value.toFixed(1)
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1)
}

function toPayload(
  query: CustomQuerySpec,
  aggregated: Array<Record<string, string | number>>,
  compareAgg?: Array<Record<string, string | number>>,
): QueryResultPayload {
  const title = query.name
  const measure = query.measures[0]

  if (query.viz === "kpi") {
    const current = num(aggregated[0]?.[measure.as])
    if (compareAgg) {
      const prev = num(compareAgg[0]?.[measure.as])
      const k = kpi(current, prev)
      return {
        kind: "kpi",
        title,
        value: formatMeasureValue(current, measure),
        rawValue: current,
        deltaPct: k.deltaPct,
        hint: `prev ${formatMeasureValue(prev, measure)}`,
      }
    }
    return {
      kind: "kpi",
      title,
      value: formatMeasureValue(current, measure),
      rawValue: current,
    }
  }

  if (query.viz === "timeseries") {
    const dimKey = query.dimensions[0].as || query.dimensions[0].field
    const sorted = [...aggregated].sort((a, b) => String(a[dimKey]).localeCompare(String(b[dimKey])))
    let points = sorted.map((r) => ({
      date: String(r[dimKey]),
      value: num(r[measure.as]),
    }))
    if (compareAgg) {
      const prevSorted = [...compareAgg].sort((a, b) =>
        String(a[dimKey]).localeCompare(String(b[dimKey])),
      )
      points = alignPreviousOntoCurrent(
        points,
        prevSorted.map((r) => ({ value: num(r[measure.as]) })),
      )
    }
    return {
      kind: "timeseries",
      title,
      points,
      valueLabel: measure.as,
      previousLabel: compareAgg ? "Previous period" : undefined,
    }
  }

  if (query.viz === "table") {
    const columns = [
      ...query.dimensions.map((d) => ({
        key: d.as || d.field,
        label: d.as || getField(d.field)?.label || d.field,
        align: "left" as const,
      })),
      ...query.measures.map((m) => ({
        key: m.as,
        label: m.as,
        align: "right" as const,
      })),
    ]
    const rows = aggregated.slice(0, 100).map((r) => {
      const out: Record<string, string | number> = {}
      for (const c of columns) {
        const v = r[c.key]
        if (typeof v === "number" && query.measures.some((m) => m.as === c.key)) {
          out[c.key] = formatMeasureValue(v, query.measures.find((m) => m.as === c.key)!)
        } else {
          out[c.key] = v ?? ""
        }
      }
      return out
    })
    return { kind: "table", title, columns, rows }
  }

  // named charts
  const dimKey = query.dimensions[0].as || query.dimensions[0].field
  const items = [...aggregated]
    .map((r) => ({ name: String(r[dimKey]), value: num(r[measure.as]) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 30)
  return { kind: "named", title, items, valueLabel: measure.as }
}

function resolvePeriodField(query: CustomQuerySpec): string | null {
  if (query.periodField) return query.periodField
  return defaultPeriodField(query.base)
}

function neededObjects(query: CustomQuerySpec): ObjectId[] {
  const set = new Set<ObjectId>([query.base])
  for (const j of query.joins) {
    const e = getEdge(j)
    if (e) {
      set.add(e.from)
      set.add(e.to)
    }
  }
  if (query.union) {
    set.add(query.union.base)
    for (const j of query.union.joins) {
      const e = getEdge(j)
      if (e) {
        set.add(e.from)
        set.add(e.to)
      }
    }
  }
  return Array.from(set)
}

function runAggregate(
  query: CustomQuerySpec,
  tables: Record<ObjectId, RowBag[]>,
  range: DateRange,
): Array<Record<string, string | number>> {
  const periodField = resolvePeriodField(query)
  let rows = buildBranchRows(
    { base: query.base, joins: query.joins, filters: query.filters },
    tables,
    periodField,
    range,
  )

  if (query.union) {
    const unionRows = buildBranchRows(query.union, tables, periodField, range)
    // Align union rows onto primary shape by only keeping fields used in measures/dims
    // Rows are already JoinedRow; just concatenate (UNION ALL) then aggregate
    rows = rows.concat(unionRows)
  }

  return groupAggregate(rows, query.dimensions, query.measures)
}

export async function executeCustomQuery(
  sb: SupabaseClient,
  query: CustomQuerySpec,
  from: string,
  to: string,
  compare?: boolean,
): Promise<QueryResultPayload> {
  const tables = await loadTables(sb, neededObjects(query))
  const range = parseRange(from, to)
  const aggregated = runAggregate(query, tables, range)

  let compareAgg: Array<Record<string, string | number>> | undefined
  if (compare && (query.viz === "kpi" || query.viz === "timeseries") && resolvePeriodField(query)) {
    compareAgg = runAggregate(query, tables, previousRange(range))
  }

  return toPayload(query, aggregated, compareAgg)
}
