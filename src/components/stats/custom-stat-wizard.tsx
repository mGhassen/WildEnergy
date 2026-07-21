"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { statsApi, type CustomQueryResult } from "@/lib/api/stats"
import type { CustomQuerySpec, FilterClause, MeasureClause, DimensionClause } from "@/lib/stats/query-spec"
import {
  SEMANTIC_OBJECTS,
  JOIN_EDGES,
  defaultPeriodField,
  dimensionFields,
  edgesFromObjects,
  measurableFields,
  objectsInQuery,
  type ObjectId,
} from "@/lib/stats/semantic"

const STEPS = ["Base", "Relations", "Filters", "Metrics", "Viz", "Preview"] as const

type Props = {
  from: string
  to: string
  compare?: boolean
  initial?: CustomQuerySpec | null
  submitLabel?: string
  onSubmit: (query: CustomQuerySpec) => void
  onCancel: () => void
}

function emptyFilter(): FilterClause {
  return { field: "", op: "eq", value: "" }
}

export function CustomStatWizard({
  from,
  to,
  compare,
  initial,
  submitLabel = "Add to board",
  onSubmit,
  onCancel,
}: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial?.name || "Custom stat")
  const [base, setBase] = useState<ObjectId>(initial?.base || "payments")
  const [joins, setJoins] = useState<string[]>(initial?.joins || [])
  const [filters, setFilters] = useState<FilterClause[]>(initial?.filters?.length ? initial.filters : [])
  const [periodField, setPeriodField] = useState<string | null>(
    initial?.periodField ?? defaultPeriodField(initial?.base || "payments"),
  )
  const [measures, setMeasures] = useState<MeasureClause[]>(
    initial?.measures?.length
      ? initial.measures
      : [{ field: "payments.__count", agg: "count", as: "count" }],
  )
  const [dimensions, setDimensions] = useState<DimensionClause[]>(initial?.dimensions || [])
  const [viz, setViz] = useState<CustomQuerySpec["viz"]>(initial?.viz || "kpi")
  const [useUnion, setUseUnion] = useState(Boolean(initial?.union))
  const [unionBase, setUnionBase] = useState<ObjectId>(initial?.union?.base || "registrations")
  const [unionJoins, setUnionJoins] = useState<string[]>(initial?.union?.joins || [])
  const [unionFilters, setUnionFilters] = useState<FilterClause[]>(initial?.union?.filters || [])
  const [preview, setPreview] = useState<CustomQueryResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const included = useMemo(() => objectsInQuery(base, joins), [base, joins])
  const availableEdges = useMemo(() => edgesFromObjects(included), [included])
  const measureOpts = useMemo(() => measurableFields(included), [included])
  const dimOpts = useMemo(() => dimensionFields(included), [included])
  const dateFields = useMemo(
    () => dimOpts.filter((d) => d.type === "date"),
    [dimOpts],
  )
  const filterFieldOpts = useMemo(() => {
    return included.flatMap((id) => {
      const obj = SEMANTIC_OBJECTS.find((o) => o.id === id)!
      return obj.fields.map((f) => ({
        ref: `${id}.${f.id}`,
        label: `${obj.label}: ${f.label}`,
        type: f.type,
        enumValues: f.enumValues,
      }))
    })
  }, [included])

  const buildQuery = (): CustomQuerySpec => ({
    name: name.trim() || "Custom stat",
    base,
    joins,
    filters: filters.filter((f) => f.field),
    measures,
    dimensions,
    periodField,
    viz,
    union: useUnion
      ? {
          base: unionBase,
          joins: unionJoins,
          filters: unionFilters.filter((f) => f.field),
        }
      : undefined,
  })

  const toggleJoin = (edgeId: string) => {
    setJoins((prev) => (prev.includes(edgeId) ? prev.filter((x) => x !== edgeId) : [...prev, edgeId]))
  }

  const toggleUnionJoin = (edgeId: string) => {
    setUnionJoins((prev) =>
      prev.includes(edgeId) ? prev.filter((x) => x !== edgeId) : [...prev, edgeId],
    )
  }

  const canNext = () => {
    if (step === 0) return !!base
    if (step === 3) return !!measures.length && !!measures[0].field && !!measures[0].as
    if (step === 4) {
      if (!name.trim() || !viz) return false
      if (viz === "kpi") return dimensions.length === 0
      if (viz === "timeseries") return dimensions.length === 1
      if (viz === "table") return true
      return dimensions.length >= 1 && dimensions.length <= 2
    }
    return true
  }

  const runPreview = async () => {
    setLoading(true)
    setPreviewError(null)
    try {
      const q = buildQuery()
      const result = await statsApi.runCustomQuery({ query: q, from, to, compare })
      setPreview(result)
    } catch (e: any) {
      setPreview(null)
      setPreviewError(e?.message || "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  const goNext = async () => {
    if (step === 4) {
      setStep(5)
      await runPreview()
      return
    }
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  // When base changes, reset period + default measure
  const onBaseChange = (id: ObjectId) => {
    setBase(id)
    setJoins([])
    setPeriodField(defaultPeriodField(id))
    setMeasures([{ field: `${id}.__count`, agg: "count", as: "count" }])
    setDimensions([])
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium",
              i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <ScrollArea className="h-[360px] pr-3">
        {step === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Start from a studio object (fact table).</p>
            <div className="grid grid-cols-2 gap-2">
              {SEMANTIC_OBJECTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    base === o.id && "border-primary bg-accent",
                  )}
                  onClick={() => onBaseChange(o.id)}
                >
                  <p className="font-medium">{o.label}</p>
                  <p className="text-[11px] text-muted-foreground">{o.fields.length} fields</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Join related objects. Included: {included.map((id) => SEMANTIC_OBJECTS.find((o) => o.id === id)?.label).join(", ")}
              </p>
              <div className="space-y-1.5">
                {JOIN_EDGES.filter(
                  (e) => joins.includes(e.id) || availableEdges.some((a) => a.id === e.id),
                ).map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={joins.includes(e.id)}
                      onCheckedChange={() => toggleJoin(e.id)}
                    />
                    <span>{e.label}</span>
                  </label>
                ))}
                {availableEdges.length === 0 && joins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No further joins from this object.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={useUnion} onCheckedChange={(v) => setUseUnion(Boolean(v))} />
                Add UNION branch
              </label>
              <p className="text-[11px] text-muted-foreground">
                Second query stacked (UNION ALL) then aggregated — same measures/dimensions apply.
              </p>
              {useUnion ? (
                <div className="space-y-2 pt-1">
                  <Select value={unionBase} onValueChange={(v) => setUnionBase(v as ObjectId)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Union base" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMANTIC_OBJECTS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {JOIN_EDGES.filter((e) => e.from === unionBase || e.to === unionBase).map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={unionJoins.includes(e.id)}
                        onCheckedChange={() => toggleUnionJoin(e.id)}
                      />
                      {e.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Period date field</Label>
              <Select
                value={periodField || "none"}
                onValueChange={(v) => setPeriodField(v === "none" ? null : v)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No period filter</SelectItem>
                  {dateFields.map((d) => (
                    <SelectItem key={d.ref} value={d.ref}>
                      {d.objectLabel}: {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Global range {from} → {to} applies to this field.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Extra filters</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setFilters((f) => [...f, emptyFilter()])}
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {filters.length === 0 ? (
                <p className="text-xs text-muted-foreground">No extra filters.</p>
              ) : (
                filters.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_1fr_28px] items-center gap-1.5">
                    <Select
                      value={f.field || undefined}
                      onValueChange={(v) =>
                        setFilters((prev) => prev.map((x, j) => (j === i ? { ...x, field: v } : x)))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {filterFieldOpts.map((opt) => (
                          <SelectItem key={opt.ref} value={opt.ref} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={f.op}
                      onValueChange={(v) =>
                        setFilters((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, op: v as FilterClause["op"] } : x)),
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["eq", "neq", "in", "gte", "lte", "contains", "is_null", "is_not_null"].map(
                          (op) => (
                            <SelectItem key={op} value={op} className="text-xs">
                              {op}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    {f.op === "is_null" || f.op === "is_not_null" ? (
                      <div />
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        value={String(f.value ?? "")}
                        onChange={(e) =>
                          setFilters((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                          )
                        }
                        placeholder="Value"
                      />
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setFilters((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Measure</Label>
              {measures.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_100px] gap-1.5">
                  <Select
                    value={m.field}
                    onValueChange={(v) =>
                      setMeasures((prev) =>
                        prev.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                field: v,
                                agg: v.endsWith(".__count") ? "count" : x.agg === "count" ? "sum" : x.agg,
                                as: x.as || "value",
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {measureOpts.map((opt) => (
                        <SelectItem key={opt.ref} value={opt.ref} className="text-xs">
                          {opt.objectLabel}: {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={m.agg}
                    onValueChange={(v) =>
                      setMeasures((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, agg: v as MeasureClause["agg"] } : x,
                        ),
                      )
                    }
                    disabled={m.field.endsWith(".__count")}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["count", "sum", "avg", "min", "max", "countDistinct"].map((a) => (
                        <SelectItem key={a} value={a} className="text-xs">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    value={m.as}
                    onChange={(e) =>
                      setMeasures((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, as: e.target.value } : x)),
                      )
                    }
                    placeholder="Alias"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Dimensions (group by)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={dimensions.length >= 2}
                  onClick={() =>
                    setDimensions((d) => [
                      ...d,
                      { field: dimOpts[0]?.ref || "", grain: "day" },
                    ])
                  }
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {dimensions.length === 0 ? (
                <p className="text-xs text-muted-foreground">None — use for KPI totals.</p>
              ) : (
                dimensions.map((d, i) => {
                  const meta = dimOpts.find((x) => x.ref === d.field)
                  return (
                    <div key={i} className="grid grid-cols-[1fr_90px_28px] gap-1.5">
                      <Select
                        value={d.field || undefined}
                        onValueChange={(v) =>
                          setDimensions((prev) =>
                            prev.map((x, j) => (j === i ? { ...x, field: v } : x)),
                          )
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {dimOpts.map((opt) => (
                            <SelectItem key={opt.ref} value={opt.ref} className="text-xs">
                              {opt.objectLabel}: {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {meta?.type === "date" ? (
                        <Select
                          value={d.grain || "day"}
                          onValueChange={(v) =>
                            setDimensions((prev) =>
                              prev.map((x, j) =>
                                j === i ? { ...x, grain: v as DimensionClause["grain"] } : x,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["day", "week", "month"].map((g) => (
                              <SelectItem key={g} value={g} className="text-xs">
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div />
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setDimensions((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Widget name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Visualization</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["kpi", "KPI"],
                    ["timeseries", "Trend"],
                    ["vbar", "Bar"],
                    ["hbar", "H-Bar"],
                    ["pie", "Pie"],
                    ["table", "Table"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "rounded-md border px-2 py-2 text-sm",
                      viz === id && "border-primary bg-accent",
                    )}
                    onClick={() => {
                      setViz(id)
                      if (id === "kpi") setDimensions([])
                      if (id === "timeseries" && dimensions.length === 0 && dateFields[0]) {
                        setDimensions([{ field: dateFields[0].ref, grain: "day" }])
                      }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                KPI = no dimensions · Trend = 1 date dim · Charts = 1–2 dims · Table = any
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{base}</Badge>
              {joins.map((j) => (
                <Badge key={j} variant="secondary">
                  {j}
                </Badge>
              ))}
              {useUnion ? <Badge variant="outline">union</Badge> : null}
              <Badge>{viz}</Badge>
            </div>
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running preview…
              </div>
            ) : previewError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {previewError}
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={runPreview}>
                  Retry
                </Button>
              </div>
            ) : preview ? (
              <PreviewBlock result={preview} />
            ) : null}
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between border-t pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}>
          {step === 0 ? (
            "Cancel"
          ) : (
            <>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
            </>
          )}
        </Button>
        {step < 5 ? (
          <Button type="button" size="sm" disabled={!canNext()} onClick={goNext}>
            Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!preview || loading}
            onClick={() => onSubmit(buildQuery())}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

function PreviewBlock({ result }: { result: CustomQueryResult }) {
  if (result.kind === "kpi") {
    return (
      <div className="rounded-md border p-4">
        <p className="text-xs text-muted-foreground">{result.title}</p>
        <p className="text-3xl font-semibold tabular-nums">{result.value}</p>
        {result.hint ? <p className="text-xs text-muted-foreground">{result.hint}</p> : null}
      </div>
    )
  }
  if (result.kind === "timeseries") {
    return (
      <div className="rounded-md border p-3">
        <p className="mb-2 text-xs font-medium">{result.title}</p>
        <div className="max-h-48 space-y-1 overflow-auto text-xs">
          {result.points.slice(0, 20).map((p) => (
            <div key={p.date} className="flex justify-between gap-2 tabular-nums">
              <span>{p.date}</span>
              <span>{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (result.kind === "named") {
    return (
      <div className="rounded-md border p-3">
        <p className="mb-2 text-xs font-medium">{result.title}</p>
        <div className="max-h-48 space-y-1 overflow-auto text-xs">
          {result.items.slice(0, 15).map((p) => (
            <div key={p.name} className="flex justify-between gap-2 tabular-nums">
              <span className="truncate">{p.name}</span>
              <span>{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-xs font-medium">{result.title}</p>
      <div className="max-h-48 overflow-auto text-xs">
        <table className="w-full">
          <thead>
            <tr>
              {result.columns.map((c) => (
                <th key={c.key} className="px-1 text-left font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.slice(0, 12).map((r, i) => (
              <tr key={i}>
                {result.columns.map((c) => (
                  <td key={c.key} className="px-1 tabular-nums">
                    {r[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
