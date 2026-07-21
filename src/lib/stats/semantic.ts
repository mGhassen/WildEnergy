/** Allowlisted analytics objects / fields / join edges — no arbitrary SQL. */

export type ObjectId =
  | "members"
  | "subscriptions"
  | "payments"
  | "plans"
  | "courses"
  | "registrations"
  | "checkins"
  | "classes"
  | "categories"
  | "trainers"

export type FieldType = "string" | "number" | "date" | "boolean" | "enum"

export type SemanticField = {
  id: string
  label: string
  type: FieldType
  /** DB / row key on the object table */
  column: string
  enumValues?: string[]
  /** Prefer this date field when applying the global period */
  periodDefault?: boolean
  /** Show in measure picker (numeric / countable) */
  measurable?: boolean
  /** Human label column for charts when this is an id */
  labelFrom?: { object: ObjectId; idColumn: string; labelColumn: string }
}

export type SemanticObject = {
  id: ObjectId
  label: string
  /** Supabase table name */
  table: string
  fields: SemanticField[]
}

export type JoinEdge = {
  id: string
  label: string
  from: ObjectId
  to: ObjectId
  fromKey: string
  toKey: string
}

export const SEMANTIC_OBJECTS: SemanticObject[] = [
  {
    id: "members",
    label: "Members",
    table: "members",
    fields: [
      { id: "id", label: "Member ID", type: "string", column: "id" },
      { id: "status", label: "Status", type: "enum", column: "status", enumValues: ["active", "inactive", "suspended"] },
      { id: "credit", label: "Credit", type: "number", column: "credit", measurable: true },
      { id: "guest_count", label: "Guest visits", type: "number", column: "guest_count", measurable: true },
      { id: "created_at", label: "Joined at", type: "date", column: "created_at", periodDefault: true },
      { id: "name", label: "Name", type: "string", column: "_name" },
    ],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    table: "subscriptions",
    fields: [
      { id: "id", label: "Subscription ID", type: "number", column: "id" },
      { id: "status", label: "Status", type: "enum", column: "status", enumValues: ["active", "pending", "expired", "cancelled"] },
      { id: "start_date", label: "Start date", type: "date", column: "start_date" },
      { id: "end_date", label: "End date", type: "date", column: "end_date", periodDefault: true },
      { id: "created_at", label: "Created at", type: "date", column: "created_at" },
      { id: "member_id", label: "Member ID", type: "string", column: "member_id" },
      { id: "plan_id", label: "Plan ID", type: "number", column: "plan_id" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    table: "payments",
    fields: [
      { id: "id", label: "Payment ID", type: "number", column: "id" },
      { id: "amount", label: "Amount", type: "number", column: "amount", measurable: true },
      { id: "discount", label: "Discount", type: "number", column: "discount", measurable: true },
      { id: "payment_type", label: "Payment type", type: "string", column: "payment_type" },
      {
        id: "payment_status",
        label: "Payment status",
        type: "enum",
        column: "payment_status",
        enumValues: ["paid", "pending", "failed", "refunded"],
      },
      { id: "payment_date", label: "Payment date", type: "date", column: "payment_date", periodDefault: true },
      { id: "due_date", label: "Due date", type: "date", column: "due_date" },
      { id: "created_at", label: "Created at", type: "date", column: "created_at" },
      { id: "member_id", label: "Member ID", type: "string", column: "member_id" },
      { id: "subscription_id", label: "Subscription ID", type: "number", column: "subscription_id" },
    ],
  },
  {
    id: "plans",
    label: "Plans",
    table: "plans",
    fields: [
      { id: "id", label: "Plan ID", type: "number", column: "id" },
      { id: "name", label: "Plan name", type: "string", column: "name" },
      { id: "price", label: "Price", type: "number", column: "price", measurable: true },
      { id: "duration_days", label: "Duration (days)", type: "number", column: "duration_days", measurable: true },
      { id: "is_active", label: "Active", type: "boolean", column: "is_active" },
    ],
  },
  {
    id: "courses",
    label: "Courses",
    table: "courses",
    fields: [
      { id: "id", label: "Course ID", type: "number", column: "id" },
      {
        id: "status",
        label: "Status",
        type: "enum",
        column: "status",
        enumValues: ["scheduled", "in_progress", "completed", "cancelled"],
      },
      { id: "course_date", label: "Course date", type: "date", column: "course_date", periodDefault: true },
      { id: "start_time", label: "Start time", type: "string", column: "start_time" },
      { id: "max_participants", label: "Capacity", type: "number", column: "max_participants", measurable: true },
      { id: "current_participants", label: "Seats taken", type: "number", column: "current_participants", measurable: true },
      { id: "class_id", label: "Class ID", type: "number", column: "class_id" },
      { id: "trainer_id", label: "Trainer ID", type: "string", column: "trainer_id" },
      { id: "is_active", label: "Active", type: "boolean", column: "is_active" },
    ],
  },
  {
    id: "registrations",
    label: "Registrations",
    table: "class_registrations",
    fields: [
      { id: "id", label: "Registration ID", type: "number", column: "id" },
      {
        id: "status",
        label: "Status",
        type: "enum",
        column: "status",
        enumValues: ["registered", "attended", "cancelled", "absent"],
      },
      { id: "registration_date", label: "Registered at", type: "date", column: "registration_date", periodDefault: true },
      { id: "member_id", label: "Member ID", type: "string", column: "member_id" },
      { id: "course_id", label: "Course ID", type: "number", column: "course_id" },
      { id: "subscription_id", label: "Subscription ID", type: "number", column: "subscription_id" },
    ],
  },
  {
    id: "checkins",
    label: "Check-ins",
    table: "checkins",
    fields: [
      { id: "id", label: "Check-in ID", type: "number", column: "id" },
      { id: "checkin_time", label: "Check-in time", type: "date", column: "checkin_time", periodDefault: true },
      { id: "session_consumed", label: "Session consumed", type: "boolean", column: "session_consumed" },
      { id: "member_id", label: "Member ID", type: "string", column: "member_id" },
      { id: "registration_id", label: "Registration ID", type: "number", column: "registration_id" },
    ],
  },
  {
    id: "classes",
    label: "Classes",
    table: "classes",
    fields: [
      { id: "id", label: "Class ID", type: "number", column: "id" },
      { id: "name", label: "Class name", type: "string", column: "name" },
      { id: "duration", label: "Duration (min)", type: "number", column: "duration", measurable: true },
      { id: "max_capacity", label: "Max capacity", type: "number", column: "max_capacity", measurable: true },
      { id: "category_id", label: "Category ID", type: "number", column: "category_id" },
      { id: "is_active", label: "Active", type: "boolean", column: "is_active" },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    table: "categories",
    fields: [
      { id: "id", label: "Category ID", type: "number", column: "id" },
      { id: "name", label: "Category name", type: "string", column: "name" },
      { id: "is_active", label: "Active", type: "boolean", column: "is_active" },
    ],
  },
  {
    id: "trainers",
    label: "Trainers",
    table: "trainers",
    fields: [
      { id: "id", label: "Trainer ID", type: "string", column: "id" },
      { id: "status", label: "Status", type: "enum", column: "status", enumValues: ["active", "inactive", "suspended"] },
      { id: "specialization", label: "Specialization", type: "string", column: "specialization" },
      { id: "name", label: "Name", type: "string", column: "_name" },
    ],
  },
]

export const JOIN_EDGES: JoinEdge[] = [
  { id: "payments_members", label: "Payments → Members", from: "payments", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "payments_subscriptions", label: "Payments → Subscriptions", from: "payments", to: "subscriptions", fromKey: "subscription_id", toKey: "id" },
  { id: "subscriptions_members", label: "Subscriptions → Members", from: "subscriptions", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "subscriptions_plans", label: "Subscriptions → Plans", from: "subscriptions", to: "plans", fromKey: "plan_id", toKey: "id" },
  { id: "registrations_members", label: "Registrations → Members", from: "registrations", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "registrations_courses", label: "Registrations → Courses", from: "registrations", to: "courses", fromKey: "course_id", toKey: "id" },
  { id: "registrations_subscriptions", label: "Registrations → Subscriptions", from: "registrations", to: "subscriptions", fromKey: "subscription_id", toKey: "id" },
  { id: "checkins_members", label: "Check-ins → Members", from: "checkins", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "checkins_registrations", label: "Check-ins → Registrations", from: "checkins", to: "registrations", fromKey: "registration_id", toKey: "id" },
  { id: "courses_classes", label: "Courses → Classes", from: "courses", to: "classes", fromKey: "class_id", toKey: "id" },
  { id: "courses_trainers", label: "Courses → Trainers", from: "courses", to: "trainers", fromKey: "trainer_id", toKey: "id" },
  { id: "classes_categories", label: "Classes → Categories", from: "classes", to: "categories", fromKey: "category_id", toKey: "id" },
]

const objectById = new Map(SEMANTIC_OBJECTS.map((o) => [o.id, o]))
const edgeById = new Map(JOIN_EDGES.map((e) => [e.id, e]))

export function getObject(id: ObjectId): SemanticObject | undefined {
  return objectById.get(id)
}

export function getEdge(id: string): JoinEdge | undefined {
  return edgeById.get(id)
}

export function fieldRef(object: ObjectId, fieldId: string): string {
  return `${object}.${fieldId}`
}

export function parseFieldRef(ref: string): { object: ObjectId; fieldId: string } | null {
  const [object, fieldId] = ref.split(".")
  if (!object || !fieldId) return null
  if (!objectById.has(object as ObjectId)) return null
  return { object: object as ObjectId, fieldId }
}

export function getField(ref: string): SemanticField | undefined {
  const parsed = parseFieldRef(ref)
  if (!parsed) return undefined
  return getObject(parsed.object)?.fields.find((f) => f.id === parsed.fieldId)
}

/** Edges reachable from a set of already-included objects (either direction). */
export function edgesFromObjects(included: ObjectId[]): JoinEdge[] {
  const set = new Set(included)
  return JOIN_EDGES.filter((e) => {
    const hasFrom = set.has(e.from)
    const hasTo = set.has(e.to)
    return (hasFrom && !hasTo) || (hasTo && !hasFrom)
  })
}

export function defaultPeriodField(base: ObjectId): string | null {
  const obj = getObject(base)
  const f = obj?.fields.find((x) => x.periodDefault) || obj?.fields.find((x) => x.type === "date")
  return f ? fieldRef(base, f.id) : null
}

export function measurableFields(objects: ObjectId[]): Array<{ ref: string; label: string; objectLabel: string }> {
  const out: Array<{ ref: string; label: string; objectLabel: string }> = []
  for (const id of objects) {
    const obj = getObject(id)
    if (!obj) continue
    out.push({ ref: fieldRef(id, "__count"), label: `Count of ${obj.label}`, objectLabel: obj.label })
    for (const f of obj.fields) {
      if (f.measurable) {
        out.push({
          ref: fieldRef(id, f.id),
          label: f.label,
          objectLabel: obj.label,
        })
      }
    }
  }
  return out
}

export function dimensionFields(objects: ObjectId[]): Array<{ ref: string; label: string; type: FieldType; objectLabel: string }> {
  const out: Array<{ ref: string; label: string; type: FieldType; objectLabel: string }> = []
  for (const id of objects) {
    const obj = getObject(id)
    if (!obj) continue
    for (const f of obj.fields) {
      if (f.id === "id") continue
      if (f.type === "number" && f.measurable && !["status"].includes(f.id)) {
        // skip pure measures as dimensions except useful ones
        if (["amount", "credit", "discount", "price", "guest_count"].includes(f.id)) continue
      }
      out.push({
        ref: fieldRef(id, f.id),
        label: f.label,
        type: f.type,
        objectLabel: obj.label,
      })
    }
  }
  return out
}

export function objectsInQuery(base: ObjectId, joinIds: string[]): ObjectId[] {
  const set = new Set<ObjectId>([base])
  for (const id of joinIds) {
    const e = getEdge(id)
    if (!e) continue
    set.add(e.from)
    set.add(e.to)
  }
  return Array.from(set)
}
