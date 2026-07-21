import { NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"
import { queryRequestSchema } from "@/lib/stats/query-spec"
import { executeCustomQuery } from "@/lib/stats/query-executor"
import { getEdge, getField } from "@/lib/stats/semantic"

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.split(" ")[1]
  if (!token) return { error: NextResponse.json({ error: "No token provided" }, { status: 401 }) }

  const {
    data: { user },
    error: authError,
  } = await supabaseServer().auth.getUser(token)
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) }
  }

  const { data: adminCheck } = await supabaseServer()
    .from("user_profiles")
    .select("is_admin, accessible_portals")
    .eq("email", user.email)
    .single()

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes("admin")) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) }
  }

  return { ok: true as const }
}

function validateAllowlist(query: {
  base: string
  joins: string[]
  filters: Array<{ field: string }>
  measures: Array<{ field: string }>
  dimensions: Array<{ field: string }>
  periodField?: string | null
  union?: { base: string; joins: string[]; filters: Array<{ field: string }> }
}): string | null {
  for (const j of query.joins) {
    if (!getEdge(j)) return `Unknown join: ${j}`
  }
  if (query.union) {
    for (const j of query.union.joins) {
      if (!getEdge(j)) return `Unknown union join: ${j}`
    }
  }
  const refs = [
    ...query.filters.map((f) => f.field),
    ...query.measures.map((m) => m.field),
    ...query.dimensions.map((d) => d.field),
    ...(query.periodField ? [query.periodField] : []),
    ...(query.union?.filters.map((f) => f.field) || []),
  ]
  const objectIds = [
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
  ]
  for (const ref of refs) {
    if (ref.endsWith(".__count")) {
      const obj = ref.slice(0, -".__count".length)
      if (!objectIds.includes(obj)) return `Invalid count field: ${ref}`
      continue
    }
    if (!getField(ref)) return `Unknown field: ${ref}`
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const parsed = queryRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const allowErr = validateAllowlist(parsed.data.query)
    if (allowErr) {
      return NextResponse.json({ error: allowErr }, { status: 400 })
    }

    const result = await executeCustomQuery(
      supabaseServer(),
      parsed.data.query,
      parsed.data.from,
      parsed.data.to,
      parsed.data.compare,
    )

    return NextResponse.json(result)
  } catch (e: any) {
    console.error("Custom stats query failed", e)
    return NextResponse.json({ error: e?.message || "Query failed" }, { status: 500 })
  }
}
