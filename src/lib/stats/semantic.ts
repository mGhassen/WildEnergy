/** Semantic analytics graph — objects/fields from drizzle tables; joins from FK map. */

import { getTableColumns, getTableName, type Table } from "drizzle-orm"
import {
  accounts,
  profiles,
  members,
  trainers,
  categories,
  groups,
  categoryGroups,
  plans,
  classes,
  schedules,
  courses,
  payments,
  subscriptions,
  subscriptionSeats,
  subscriptionInvites,
  classRegistrations,
  checkins,
  memberCreditEntries,
} from "@/shared/schema"

export const OBJECT_IDS = [
  "accounts",
  "profiles",
  "members",
  "trainers",
  "categories",
  "groups",
  "category_groups",
  "plans",
  "classes",
  "schedules",
  "courses",
  "subscriptions",
  "subscription_seats",
  "subscription_invites",
  "payments",
  "registrations",
  "checkins",
  "credit_entries",
] as const

export type ObjectId = (typeof OBJECT_IDS)[number]

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
  /** Hide from wizard pickers (still resolvable if referenced) */
  hidden?: boolean
  /** Computed at read time — not a DB column */
  derived?: "age" | "credit" | "name"
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

type RegistryEntry = {
  id: ObjectId
  label: string
  drizzle: Table
  periodDefaultColumn?: string
  hideColumns?: string[]
  enumOverrides?: Record<string, string[]>
  derivedFields?: SemanticField[]
}

function humanize(column: string): string {
  return column
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function mapColumnType(col: {
  name: string
  dataType: string
  columnType: string
  enumValues?: string[] | null
}): { type: FieldType; measurable?: boolean; enumValues?: string[] } {
  const enums = col.enumValues?.length ? [...col.enumValues] : undefined
  if (col.dataType === "boolean" || col.columnType === "PgBoolean") {
    return { type: "boolean" }
  }
  if (
    col.dataType === "date" ||
    col.columnType === "PgDate" ||
    col.columnType === "PgTimestamp" ||
    col.columnType === "PgTimestampString"
  ) {
    return { type: "date" }
  }
  // PgNumeric is dataType "string" in drizzle but is numeric money/qty in DB
  const isNumericCol =
    col.dataType === "number" ||
    col.columnType === "PgInteger" ||
    col.columnType === "PgSmallInt" ||
    col.columnType === "PgBigInt53" ||
    col.columnType === "PgBigInt64" ||
    col.columnType === "PgSerial" ||
    col.columnType === "PgNumeric" ||
    col.columnType === "PgNumericNumber" ||
    col.columnType === "PgDoublePrecision" ||
    col.columnType === "PgReal"
  if (isNumericCol) {
    const isIdLike = col.name === "id" || col.name.endsWith("_id")
    return { type: "number", measurable: !isIdLike }
  }
  if (enums) return { type: "enum", enumValues: enums }
  return { type: "string" }
}

function fieldsFromTable(entry: RegistryEntry): SemanticField[] {
  const cols = getTableColumns(entry.drizzle)
  const hide = new Set(entry.hideColumns || [])
  const fields: SemanticField[] = []

  for (const col of Object.values(cols)) {
    const name = col.name
    if (hide.has(name)) {
      fields.push({
        id: name,
        label: humanize(name),
        type: "string",
        column: name,
        hidden: true,
      })
      continue
    }

    const mapped = mapColumnType(col as any)
    const enumValues = entry.enumOverrides?.[name] || mapped.enumValues
    fields.push({
      id: name,
      label: humanize(name),
      type: enumValues ? "enum" : mapped.type,
      column: name,
      enumValues,
      measurable: mapped.measurable,
      periodDefault: entry.periodDefaultColumn === name,
    })
  }

  for (const d of entry.derivedFields || []) {
    fields.push(d)
  }

  return fields
}

const REGISTRY: RegistryEntry[] = [
  {
    id: "accounts",
    label: "Accounts",
    drizzle: accounts,
    periodDefaultColumn: "created_at",
    enumOverrides: {
      status: ["active", "pending", "archived", "suspended"],
    },
  },
  {
    id: "profiles",
    label: "Profiles",
    drizzle: profiles,
    periodDefaultColumn: "created_at",
    derivedFields: [
      {
        id: "age",
        label: "Age",
        type: "number",
        column: "_age",
        measurable: true,
        derived: "age",
      },
      {
        id: "name",
        label: "Name",
        type: "string",
        column: "_name",
        derived: "name",
      },
    ],
  },
  {
    id: "members",
    label: "Members",
    drizzle: members,
    periodDefaultColumn: "created_at",
    enumOverrides: {
      status: ["active", "inactive", "suspended"],
    },
    derivedFields: [
      {
        id: "credit",
        label: "Credit",
        type: "number",
        column: "credit",
        measurable: true,
        derived: "credit",
      },
      {
        id: "name",
        label: "Name",
        type: "string",
        column: "_name",
        derived: "name",
      },
    ],
  },
  {
    id: "trainers",
    label: "Trainers",
    drizzle: trainers,
    periodDefaultColumn: "created_at",
    enumOverrides: {
      status: ["active", "inactive", "suspended"],
    },
    derivedFields: [
      {
        id: "name",
        label: "Name",
        type: "string",
        column: "_name",
        derived: "name",
      },
    ],
  },
  {
    id: "categories",
    label: "Categories",
    drizzle: categories,
    periodDefaultColumn: "created_at",
  },
  {
    id: "groups",
    label: "Groups",
    drizzle: groups,
    periodDefaultColumn: "created_at",
  },
  {
    id: "category_groups",
    label: "Category ↔ Groups",
    drizzle: categoryGroups,
    periodDefaultColumn: "created_at",
  },
  {
    id: "plans",
    label: "Plans",
    drizzle: plans,
  },
  {
    id: "classes",
    label: "Classes",
    drizzle: classes,
    periodDefaultColumn: "created_at",
  },
  {
    id: "schedules",
    label: "Schedules",
    drizzle: schedules,
    periodDefaultColumn: "schedule_date",
  },
  {
    id: "courses",
    label: "Courses",
    drizzle: courses,
    periodDefaultColumn: "course_date",
    enumOverrides: {
      status: ["scheduled", "in_progress", "completed", "cancelled"],
    },
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    drizzle: subscriptions,
    periodDefaultColumn: "end_date",
    enumOverrides: {
      status: ["active", "pending", "expired", "cancelled", "completed"],
    },
  },
  {
    id: "subscription_seats",
    label: "Subscription seats",
    drizzle: subscriptionSeats,
    periodDefaultColumn: "created_at",
    enumOverrides: {
      role: ["owner", "member"],
      status: ["active", "revoked"],
    },
  },
  {
    id: "subscription_invites",
    label: "Subscription invites",
    drizzle: subscriptionInvites,
    periodDefaultColumn: "created_at",
    hideColumns: ["token"],
    enumOverrides: {
      status: ["pending", "accepted", "revoked", "expired"],
    },
  },
  {
    id: "payments",
    label: "Payments",
    drizzle: payments,
    periodDefaultColumn: "payment_date",
    enumOverrides: {
      payment_status: ["paid", "pending", "failed", "refunded"],
    },
  },
  {
    id: "registrations",
    label: "Registrations",
    drizzle: classRegistrations,
    periodDefaultColumn: "registration_date",
    enumOverrides: {
      status: ["registered", "attended", "cancelled", "absent"],
    },
  },
  {
    id: "checkins",
    label: "Check-ins",
    drizzle: checkins,
    periodDefaultColumn: "checkin_time",
  },
  {
    id: "credit_entries",
    label: "Credit entries",
    drizzle: memberCreditEntries,
    periodDefaultColumn: "entry_date",
    enumOverrides: {
      entry_type: [
        "manual_add",
        "manual_remove",
        "payment_use",
        "payment_excess",
        "payment_reversal",
        "initial",
        "opening_balance",
      ],
    },
  },
]

export const SEMANTIC_OBJECTS: SemanticObject[] = REGISTRY.map((entry) => ({
  id: entry.id,
  label: entry.label,
  table: getTableName(entry.drizzle),
  fields: fieldsFromTable(entry),
}))

export const JOIN_EDGES: JoinEdge[] = [
  { id: "profiles_accounts", label: "Profiles → Accounts", from: "profiles", to: "accounts", fromKey: "id", toKey: "id" },
  { id: "members_accounts", label: "Members → Accounts", from: "members", to: "accounts", fromKey: "account_id", toKey: "id" },
  { id: "members_profiles", label: "Members → Profiles", from: "members", to: "profiles", fromKey: "profile_id", toKey: "id" },
  { id: "trainers_accounts", label: "Trainers → Accounts", from: "trainers", to: "accounts", fromKey: "account_id", toKey: "id" },
  { id: "trainers_profiles", label: "Trainers → Profiles", from: "trainers", to: "profiles", fromKey: "profile_id", toKey: "id" },
  { id: "category_groups_categories", label: "Category-groups → Categories", from: "category_groups", to: "categories", fromKey: "category_id", toKey: "id" },
  { id: "category_groups_groups", label: "Category-groups → Groups", from: "category_groups", to: "groups", fromKey: "group_id", toKey: "id" },
  { id: "classes_categories", label: "Classes → Categories", from: "classes", to: "categories", fromKey: "category_id", toKey: "id" },
  { id: "schedules_classes", label: "Schedules → Classes", from: "schedules", to: "classes", fromKey: "class_id", toKey: "id" },
  { id: "schedules_trainers", label: "Schedules → Trainers", from: "schedules", to: "trainers", fromKey: "trainer_id", toKey: "id" },
  { id: "courses_schedules", label: "Courses → Schedules", from: "courses", to: "schedules", fromKey: "schedule_id", toKey: "id" },
  { id: "courses_classes", label: "Courses → Classes", from: "courses", to: "classes", fromKey: "class_id", toKey: "id" },
  { id: "courses_trainers", label: "Courses → Trainers", from: "courses", to: "trainers", fromKey: "trainer_id", toKey: "id" },
  { id: "subscriptions_members", label: "Subscriptions → Members", from: "subscriptions", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "subscriptions_plans", label: "Subscriptions → Plans", from: "subscriptions", to: "plans", fromKey: "plan_id", toKey: "id" },
  { id: "seats_subscriptions", label: "Seats → Subscriptions", from: "subscription_seats", to: "subscriptions", fromKey: "subscription_id", toKey: "id" },
  { id: "seats_members", label: "Seats → Members", from: "subscription_seats", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "seats_invited_by", label: "Seats → Invited-by member", from: "subscription_seats", to: "members", fromKey: "invited_by_member_id", toKey: "id" },
  { id: "invites_subscriptions", label: "Invites → Subscriptions", from: "subscription_invites", to: "subscriptions", fromKey: "subscription_id", toKey: "id" },
  { id: "invites_invited_by", label: "Invites → Invited-by member", from: "subscription_invites", to: "members", fromKey: "invited_by_member_id", toKey: "id" },
  { id: "invites_accepted_member", label: "Invites → Accepted member", from: "subscription_invites", to: "members", fromKey: "accepted_member_id", toKey: "id" },
  { id: "payments_subscriptions", label: "Payments → Subscriptions", from: "payments", to: "subscriptions", fromKey: "subscription_id", toKey: "id" },
  { id: "payments_members", label: "Payments → Members", from: "payments", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "registrations_members", label: "Registrations → Members", from: "registrations", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "registrations_courses", label: "Registrations → Courses", from: "registrations", to: "courses", fromKey: "course_id", toKey: "id" },
  { id: "registrations_subscriptions", label: "Registrations → Subscriptions", from: "registrations", to: "subscriptions", fromKey: "subscription_id", toKey: "id" },
  { id: "registrations_groups", label: "Registrations → Groups", from: "registrations", to: "groups", fromKey: "group_id", toKey: "id" },
  { id: "checkins_members", label: "Check-ins → Members", from: "checkins", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "checkins_registrations", label: "Check-ins → Registrations", from: "checkins", to: "registrations", fromKey: "registration_id", toKey: "id" },
  { id: "credit_entries_members", label: "Credit entries → Members", from: "credit_entries", to: "members", fromKey: "member_id", toKey: "id" },
  { id: "credit_entries_payments", label: "Credit entries → Payments", from: "credit_entries", to: "payments", fromKey: "payment_id", toKey: "id" },
]

const objectById = new Map(SEMANTIC_OBJECTS.map((o) => [o.id, o]))
const edgeById = new Map(JOIN_EDGES.map((e) => [e.id, e]))

export function isObjectId(id: string): id is ObjectId {
  return objectById.has(id as ObjectId)
}

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
  const f = obj?.fields.find((x) => x.periodDefault) || obj?.fields.find((x) => x.type === "date" && !x.hidden)
  return f ? fieldRef(base, f.id) : null
}

export function measurableFields(objects: ObjectId[]): Array<{ ref: string; label: string; objectLabel: string }> {
  const out: Array<{ ref: string; label: string; objectLabel: string }> = []
  for (const id of objects) {
    const obj = getObject(id)
    if (!obj) continue
    out.push({ ref: fieldRef(id, "__count"), label: `Count of ${obj.label}`, objectLabel: obj.label })
    for (const f of obj.fields) {
      if (f.hidden) continue
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

const SKIP_AS_DIMENSION = new Set(["amount", "credit", "discount", "price", "guest_count", "balance_after", "hourly_rate"])

export function dimensionFields(objects: ObjectId[]): Array<{ ref: string; label: string; type: FieldType; objectLabel: string }> {
  const out: Array<{ ref: string; label: string; type: FieldType; objectLabel: string }> = []
  for (const id of objects) {
    const obj = getObject(id)
    if (!obj) continue
    for (const f of obj.fields) {
      if (f.hidden) continue
      if (f.id === "id") continue
      if (f.type === "number" && f.measurable && SKIP_AS_DIMENSION.has(f.id)) continue
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

export function visibleFields(object: SemanticObject): SemanticField[] {
  return object.fields.filter((f) => !f.hidden)
}
