import { differenceInCalendarDays, format, parseISO } from "date-fns"
import type { NamedCount, TimePoint } from "@/lib/api/stats"
import {
  countBy,
  daysUntil,
  dayOfWeekLabel,
  inRange,
  num,
  profileName,
  sumMapIntoBuckets,
  timeSeriesFromMap,
  type DateRange,
} from "@/lib/stats/aggregations"

function ageFromDob(dob: unknown, asOf: Date): number | null {
  if (!dob) return null
  const birth = parseISO(String(dob).slice(0, 10))
  if (Number.isNaN(birth.getTime())) return null
  let age = asOf.getFullYear() - birth.getFullYear()
  const m = asOf.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

function ageBucket(age: number | null): string {
  if (age == null) return "unknown"
  if (age < 18) return "<18"
  if (age <= 24) return "18–24"
  if (age <= 34) return "25–34"
  if (age <= 44) return "35–44"
  if (age <= 54) return "45–54"
  return "55+"
}

function median(nums: number[]): number | null {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function durationBand(days: number): string {
  if (days <= 7) return "≤7d"
  if (days <= 30) return "8–30d"
  if (days <= 90) return "31–90d"
  if (days <= 180) return "91–180d"
  return "180d+"
}

function priceBand(price: number): string {
  if (price <= 0) return "Free"
  if (price < 50) return "<50"
  if (price < 100) return "50–99"
  if (price < 200) return "100–199"
  return "200+"
}

function leadBucket(days: number): string {
  if (days <= 0) return "0"
  if (days <= 3) return "1–3"
  if (days <= 7) return "4–7"
  return "8+"
}

function timeOfDay(start: string | null | undefined): string {
  if (!start) return "unknown"
  const h = parseInt(String(start).slice(0, 2), 10)
  if (!Number.isFinite(h)) return "unknown"
  if (h < 12) return "Morning"
  if (h < 17) return "Afternoon"
  return "Evening"
}

function experienceBand(years: number): string {
  if (years <= 0) return "0"
  if (years <= 2) return "1–2"
  if (years <= 5) return "3–5"
  if (years <= 10) return "6–10"
  return "10+"
}

const CREDIT_ISSUE = new Set(["manual_add", "payment_excess", "initial", "opening_balance"])
const CREDIT_USE = new Set(["manual_remove", "payment_use", "payment_reversal"])

export type ExtendedComputeInput = {
  range: DateRange
  members: any[]
  payments: any[]
  courses: any[]
  registrations: any[]
  checkins: any[]
  subscriptions: any[]
  seats: any[]
  invites: any[]
  creditEntries: any[]
  accounts: any[]
  trainersRaw: any[]
  plansById: Map<number, any>
  classesById: Map<number, any>
  categoriesById: Map<number, any>
  trainersById: Map<string, { id: string; name: string }>
  groupsById: Map<number, any>
  // precomputed from main path
  activeMemberIds: Set<string>
  paidRevenue: number
  paidInRange: any[]
  pendingInPeriod: any[]
  overduePayments: any[]
  regsInRange: any[]
  nonCancelled: any[]
  checkinsInRange: any[]
  attendedCount: number
  coursesInPeriod: any[]
  filteredCourses: any[]
  completedCourses: number
  cancelledCourses: number
  capacityWaste: number
  activeSubs: any[]
  filteredSubs: any[]
  sgs: any[]
  fillRateByClass: Array<{ name: string; fillRate: number; seats: number; capacity: number }>
}

export function computeExtended(input: ExtendedComputeInput) {
  const {
    range,
    members,
    payments,
    courses,
    registrations,
    checkins,
    subscriptions,
    seats,
    invites,
    creditEntries,
    accounts,
    trainersRaw,
    plansById,
    classesById,
    categoriesById,
    trainersById,
    groupsById,
    activeMemberIds,
    paidRevenue,
    paidInRange,
    pendingInPeriod,
    overduePayments,
    regsInRange,
    nonCancelled,
    checkinsInRange,
    attendedCount,
    coursesInPeriod,
    filteredCourses,
    completedCourses,
    cancelledCourses,
    capacityWaste,
    activeSubs,
    filteredSubs,
    sgs,
    fillRateByClass,
  } = input

  const asOf = range.to
  const rangeEnd = format(range.to, "yyyy-MM-dd")
  const accountsById = new Map(accounts.map((a: any) => [a.id, a]))
  const membersById = new Map(members.map((m: any) => [String(m.id), m]))

  // ---- Members extended ----
  const ages = members
    .map((m) => ageFromDob(m.profile?.date_of_birth, asOf))
    .filter((a): a is number => a != null)
  const ageBuckets = countBy(
    members,
    (m) => ageBucket(ageFromDob(m.profile?.date_of_birth, asOf)),
  )
  const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null
  const medianAge = median(ages)
  const blacklistCount = members.filter((m) => m.is_blacklisted).length
  const guestTotal = members.reduce((s, m) => s + num(m.guest_count), 0)
  const inactiveCount = members.filter((m) => m.status === "inactive").length
  const suspendedCount = members.filter((m) => m.status === "suspended").length

  const attendedByMember = new Map<string, number>()
  const classByMember = new Map<string, Set<number>>()
  for (const r of nonCancelled) {
    if (r.status !== "attended" && !checkinsInRange.some((c) => c.registration_id === r.id)) continue
    const mid = String(r.member_id)
    attendedByMember.set(mid, (attendedByMember.get(mid) || 0) + 1)
    const course = courses.find((c) => c.id === r.course_id)
    if (course?.class_id) {
      const set = classByMember.get(mid) || new Set()
      set.add(course.class_id)
      classByMember.set(mid, set)
    }
  }
  let returningBookers = 0
  let oneTimeBookers = 0
  for (const n of attendedByMember.values()) {
    if (n >= 2) returningBookers++
    else oneTimeBookers++
  }
  const memberIdsWithRegs = new Set(regsInRange.map((r) => String(r.member_id)))
  const zeroActivityMembers = members.filter(
    (m) => m.status === "active" && !memberIdsWithRegs.has(String(m.id)),
  ).length
  const membersWithCredit = members.filter((m) => num(m.credit) > 0).length
  const avgCreditBalance = members.length
    ? members.reduce((s, m) => s + num(m.credit), 0) / members.length
    : 0

  const accountStatusMix = countBy(
    members.filter((m) => m.account_id && accountsById.has(m.account_id)),
    (m) => accountsById.get(m.account_id)?.status || "unknown",
  )
  let neverLoggedIn = 0
  let staleLogins = 0
  const staleCutoff = new Date(asOf)
  staleCutoff.setDate(staleCutoff.getDate() - 30)
  for (const m of members) {
    if (!m.account_id) continue
    const acc = accountsById.get(m.account_id)
    if (!acc) continue
    if (!acc.last_login) neverLoggedIn++
    else if (parseISO(String(acc.last_login).slice(0, 10)) < staleCutoff) staleLogins++
  }
  const phoneMissing = members.filter((m) => !m.profile?.phone).length
  const emailMissing = members.filter((m) => !m.profile?.profile_email).length
  const joinsByWeekday = (() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const m of members) {
      if (!inRange(m.created_at, range) || !m.created_at) continue
      counts[parseISO(m.created_at.slice(0, 10)).getDay()]++
    }
    return counts.map((value, i) => ({ name: dayOfWeekLabel(i), value }))
  })()
  const creditHoldersMix: NamedCount[] = [
    { name: "With credit", value: membersWithCredit },
    { name: "Zero credit", value: members.length - membersWithCredit },
  ]
  const newestMembers = [...members]
    .filter((m) => inRange(m.created_at, range))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 15)
    .map((m) => ({
      id: String(m.id),
      name: profileName(m.profile),
      joined: String(m.created_at || "").slice(0, 10),
      status: m.status || "",
    }))
  const dormantActives = members
    .filter((m) => m.status === "active" && !memberIdsWithRegs.has(String(m.id)))
    .slice(0, 20)
    .map((m) => ({ id: String(m.id), name: profileName(m.profile), status: m.status }))
  const topCreditWallets = [...members]
    .filter((m) => num(m.credit) > 0)
    .sort((a, b) => num(b.credit) - num(a.credit))
    .slice(0, 15)
    .map((m) => ({ id: String(m.id), name: profileName(m.profile), credit: num(m.credit) }))
  const blacklistRows = members
    .filter((m) => m.is_blacklisted)
    .slice(0, 30)
    .map((m) => ({ id: String(m.id), name: profileName(m.profile) }))

  // ---- Finances extended ----
  const creditInPeriod = creditEntries.filter((e) => inRange(e.entry_date || e.created_at, range))
  let creditIssued = 0
  let creditUsed = 0
  for (const e of creditInPeriod) {
    const amt = Math.abs(num(e.amount))
    if (CREDIT_ISSUE.has(e.entry_type) || num(e.amount) > 0) creditIssued += num(e.amount) > 0 ? num(e.amount) : amt
    if (CREDIT_USE.has(e.entry_type) || num(e.amount) < 0) creditUsed += num(e.amount) < 0 ? Math.abs(num(e.amount)) : amt
  }
  // Prefer sign of amount when types ambiguous
  creditIssued = creditInPeriod.filter((e) => num(e.amount) > 0).reduce((s, e) => s + num(e.amount), 0)
  creditUsed = creditInPeriod.filter((e) => num(e.amount) < 0).reduce((s, e) => s + Math.abs(num(e.amount)), 0)
  const creditNet = creditIssued - creditUsed
  const creditMap = sumMapIntoBuckets(
    range,
    creditInPeriod.map((e) => ({
      date: e.entry_date || e.created_at,
      amount: num(e.amount),
    })),
  )
  const creditOverTime = timeSeriesFromMap(range, creditMap)
  const creditByType = countBy(creditInPeriod, (e) => e.entry_type || "unknown", (e) => Math.abs(num(e.amount)))
  const paymentsInRange = payments.filter((p) => inRange(p.payment_date || p.created_at, range))
  const paymentStatusMix = countBy(paymentsInRange, (p) => p.payment_status || "unknown")
  const failedAmount = paymentsInRange
    .filter((p) => p.payment_status === "failed")
    .reduce((s, p) => s + num(p.amount), 0)
  const refundedAmount = paymentsInRange
    .filter((p) => p.payment_status === "refunded")
    .reduce((s, p) => s + num(p.amount), 0)
  const pendingAmount = pendingInPeriod.reduce((s, p) => s + num(p.amount), 0)
  const discountTotal = paidInRange.reduce((s, p) => s + num(p.discount), 0)
  const grossPaid = paidRevenue + discountTotal
  const discountRate = grossPaid > 0 ? (discountTotal / grossPaid) * 100 : 0
  const netRevenue = paidRevenue - refundedAmount
  const revWeekday = [0, 0, 0, 0, 0, 0, 0]
  for (const p of paidInRange) {
    const d = p.payment_date || p.created_at
    if (!d) continue
    revWeekday[parseISO(String(d).slice(0, 10)).getDay()] += num(p.amount)
  }
  const revenueByWeekday = revWeekday.map((value, i) => ({ name: dayOfWeekLabel(i), value: Math.round(value * 100) / 100 }))
  const payerMap = new Map<string, number>()
  for (const p of paidInRange) {
    const id = String(p.member_id)
    payerMap.set(id, (payerMap.get(id) || 0) + num(p.amount))
  }
  const topPayers = [...payerMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([id, amount]) => ({
      id,
      name: profileName(membersById.get(id)?.profile),
      amount,
    }))
  const payDelays: number[] = []
  for (const p of paidInRange) {
    if (!p.due_date || !p.payment_date) continue
    payDelays.push(
      differenceInCalendarDays(parseISO(String(p.payment_date).slice(0, 10)), parseISO(String(p.due_date).slice(0, 10))),
    )
  }
  const avgDaysToPay = payDelays.length ? payDelays.reduce((a, b) => a + b, 0) / payDelays.length : null
  let freeRev = 0
  let paidPlanRev = 0
  const durationRev = new Map<string, number>()
  for (const p of paidInRange) {
    const sub = subscriptions.find((s) => s.id === p.subscription_id)
    const plan = sub ? plansById.get(sub.plan_id) : null
    if (plan?.is_free) freeRev += num(p.amount)
    else paidPlanRev += num(p.amount)
    const band = durationBand(num(plan?.duration_days) || 0)
    durationRev.set(band, (durationRev.get(band) || 0) + num(p.amount))
  }
  const freeVsPaidRevenue: NamedCount[] = [
    { name: "Free plans", value: Math.round(freeRev * 100) / 100 },
    { name: "Paid plans", value: Math.round(paidPlanRev * 100) / 100 },
  ]
  const revenueByPlanDuration = [...durationRev.entries()].map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }))
  const aging = { "0–7": 0, "8–14": 0, "15–30": 0, "31+": 0 }
  for (const p of overduePayments) {
    const due = String(p.due_date).slice(0, 10)
    const late = differenceInCalendarDays(parseISO(rangeEnd), parseISO(due))
    const amt = num(p.amount)
    if (late <= 7) aging["0–7"] += amt
    else if (late <= 14) aging["8–14"] += amt
    else if (late <= 30) aging["15–30"] += amt
    else aging["31+"] += amt
  }
  const outstandingAging = Object.entries(aging).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }))
  const largestDiscounts = [...paidInRange]
    .filter((p) => num(p.discount) > 0)
    .sort((a, b) => num(b.discount) - num(a.discount))
    .slice(0, 15)
    .map((p) => ({
      memberName: profileName(membersById.get(String(p.member_id))?.profile),
      amount: num(p.amount),
      discount: num(p.discount),
    }))
  const overduePaymentRows = overduePayments.slice(0, 20).map((p) => ({
    memberName: profileName(membersById.get(String(p.member_id))?.profile),
    amount: num(p.amount),
    dueDate: String(p.due_date || "").slice(0, 10),
    daysLate: p.due_date
      ? differenceInCalendarDays(parseISO(rangeEnd), parseISO(String(p.due_date).slice(0, 10)))
      : 0,
  }))
  const failedPaymentRows = paymentsInRange
    .filter((p) => p.payment_status === "failed")
    .slice(0, 20)
    .map((p) => ({
      memberName: profileName(membersById.get(String(p.member_id))?.profile),
      amount: num(p.amount),
      date: String(p.payment_date || p.created_at || "").slice(0, 10),
    }))

  let mrrProxy = 0
  for (const s of activeSubs) {
    const plan = plansById.get(s.plan_id)
    if (!plan || plan.is_free) continue
    const days = num(plan.duration_days) || 30
    mrrProxy += (num(plan.price) / days) * 30
  }
  const checkinCount = checkinsInRange.length
  const revenuePerVisit = checkinCount > 0 ? paidRevenue / checkinCount : 0
  const revenuePerCourse = completedCourses > 0 ? paidRevenue / completedCourses : 0
  const partialCreditPays = creditInPeriod.filter((e) => e.entry_type === "payment_use").length

  // ---- Attendance extended ----
  const absentCount = regsInRange.filter((r) => r.status === "absent").length
  const cancelledRegs = regsInRange.filter((r) => r.status === "cancelled").length
  const noShowRate = nonCancelled.length ? (absentCount / nonCancelled.length) * 100 : 0
  const cancelRate = regsInRange.length ? (cancelledRegs / regsInRange.length) * 100 : 0
  const byGroup = countBy(
    regsInRange.filter((r) => r.group_id),
    (r) => groupsById.get(r.group_id)?.name || `Group ${r.group_id}`,
  ).slice(0, 12)
  const regStatusMix = countBy(regsInRange, (r) => r.status || "unknown")
  const sessionSourceMix = countBy(regsInRange, (r) => r.session_source || "guest/legacy")
  const checkinConversion = attendedCount > 0 ? (checkinCount / attendedCount) * 100 : 0
  const uniqueBookers = new Set(regsInRange.map((r) => String(r.member_id))).size
  const uniqueCheckinMembers = new Set(checkinsInRange.map((c) => String(c.member_id))).size
  const regsPerActiveMember = activeMemberIds.size ? regsInRange.length / activeMemberIds.size : 0
  const checkinsByMember = new Map<string, number>()
  for (const c of checkinsInRange) {
    const id = String(c.member_id)
    checkinsByMember.set(id, (checkinsByMember.get(id) || 0) + 1)
  }
  const multiCheckin = [...checkinsByMember.values()].filter((n) => n >= 2).length
  const repeatVisitRate = uniqueCheckinMembers ? (multiCheckin / uniqueCheckinMembers) * 100 : 0
  const attWeekday = [0, 0, 0, 0, 0, 0, 0]
  const attHour = new Array(24).fill(0)
  for (const r of nonCancelled) {
    if (r.status !== "attended" && !checkinsInRange.some((c) => c.registration_id === r.id)) continue
    const course = courses.find((c) => c.id === r.course_id)
    if (!course?.course_date) continue
    attWeekday[parseISO(String(course.course_date).slice(0, 10)).getDay()]++
    if (course.start_time) {
      const h = parseInt(String(course.start_time).slice(0, 2), 10)
      if (Number.isFinite(h)) attHour[h]++
    }
  }
  const attendanceByWeekday = attWeekday.map((value, i) => ({ name: dayOfWeekLabel(i), value }))
  const attendanceByHour = attHour
    .map((value, i) => ({ name: `${String(i).padStart(2, "0")}:00`, value }))
    .filter((h) => h.value > 0)
  const leadTimes: number[] = []
  let sameDay = 0
  let advance7 = 0
  const leadBuckets = new Map<string, number>()
  for (const r of regsInRange) {
    const course = courses.find((c) => c.id === r.course_id)
    if (!course?.course_date || !r.registration_date) continue
    const lead = differenceInCalendarDays(
      parseISO(String(course.course_date).slice(0, 10)),
      parseISO(String(r.registration_date).slice(0, 10)),
    )
    leadTimes.push(lead)
    if (lead <= 0) sameDay++
    if (lead >= 7) advance7++
    const b = leadBucket(lead)
    leadBuckets.set(b, (leadBuckets.get(b) || 0) + 1)
  }
  const avgLeadTimeDays = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null
  const sameDayBookingRate = regsInRange.length ? (sameDay / regsInRange.length) * 100 : 0
  const advanceBookings7dRate = regsInRange.length ? (advance7 / regsInRange.length) * 100 : 0
  const leadTimeBuckets = ["0", "1–3", "4–7", "8+"].map((name) => ({
    name,
    value: leadBuckets.get(name) || 0,
  }))
  const multiClassMembers = [...classByMember.values()].filter((s) => s.size >= 2).length
  const poolRegs = regsInRange.filter((r) => r.session_source === "pool").length
  const dedicatedRegs = regsInRange.filter((r) => r.session_source === "dedicated").length
  const guestLikeRegs = regsInRange.filter((r) => !r.session_source).length
  const checkinsWithoutSessionConsumed = checkinsInRange.filter((c) => c.session_consumed === false).length

  const absentByMember = new Map<string, number>()
  for (const r of regsInRange.filter((x) => x.status === "absent")) {
    const id = String(r.member_id)
    absentByMember.set(id, (absentByMember.get(id) || 0) + 1)
  }
  const frequentAttendees = [...attendedByMember.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([id, attended]) => ({
      id,
      name: profileName(membersById.get(id)?.profile),
      attended,
      checkins: checkinsByMember.get(id) || 0,
    }))
  const chronicNoShows = [...absentByMember.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([id, absent]) => ({
      id,
      name: profileName(membersById.get(id)?.profile),
      absent,
    }))

  // ---- Program extended ----
  const catFill = new Map<string, { sum: number; n: number }>()
  let capSum = 0
  let seatsSum = 0
  let emptyCourses = 0
  let fullCourses = 0
  let underfilledCourses = 0
  const emptyCourseRows: any[] = []
  const fillTrendMap = new Map<string, { sum: number; n: number }>()
  const cancelTrendMap = new Map<string, { cancelled: number; total: number }>()
  const todMix = new Map<string, number>()
  let weekend = 0
  let weekday = 0
  const classCancel = new Map<string, { cancelled: number; total: number }>()

  for (const c of filteredCourses.filter((x) => inRange(x.course_date, range))) {
    const cls = classesById.get(c.class_id)
    const catName = cls ? categoriesById.get(cls.category_id)?.name || "Unknown" : "Unknown"
    const cap = num(c.max_participants) || 1
    const fromRegs = nonCancelled.filter((r) => r.course_id === c.id).length
    const filled = Math.max(num(c.current_participants), fromRegs)
    const fill = (Math.min(filled, cap) / cap) * 100
    if (c.status !== "cancelled") {
      const ag = catFill.get(catName) || { sum: 0, n: 0 }
      ag.sum += fill
      ag.n++
      catFill.set(catName, ag)
      capSum += cap
      seatsSum += filled
      if (filled === 0) {
        emptyCourses++
        emptyCourseRows.push({
          date: String(c.course_date).slice(0, 10),
          className: cls?.name || "Unknown",
          trainerName: trainersById.get(String(c.trainer_id))?.name || "—",
          seats: filled,
          capacity: cap,
        })
      }
      if (fill >= 95) fullCourses++
      if (fill < 50) underfilledCourses++
      const key = String(c.course_date).slice(0, 10)
      const ft = fillTrendMap.get(key) || { sum: 0, n: 0 }
      ft.sum += fill
      ft.n++
      fillTrendMap.set(key, ft)
      const tod = timeOfDay(c.start_time)
      todMix.set(tod, (todMix.get(tod) || 0) + 1)
      const dow = parseISO(String(c.course_date).slice(0, 10)).getDay()
      if (dow === 0 || dow === 6) weekend++
      else weekday++
    }
    const ck = cls?.name || "Unknown"
    const cc = classCancel.get(ck) || { cancelled: 0, total: 0 }
    cc.total++
    if (c.status === "cancelled") cc.cancelled++
    classCancel.set(ck, cc)
    const ctk = String(c.course_date).slice(0, 10)
    const ct = cancelTrendMap.get(ctk) || { cancelled: 0, total: 0 }
    ct.total++
    if (c.status === "cancelled") ct.cancelled++
    cancelTrendMap.set(ctk, ct)
  }

  const fillByCategory = [...catFill.entries()]
    .map(([name, v]) => ({ name, value: Math.round((v.sum / v.n) * 10) / 10 }))
    .sort((a, b) => b.value - a.value)
  const coursesMap = sumMapIntoBuckets(
    range,
    coursesInPeriod.map((c) => ({ date: c.course_date, amount: 1 })),
  )
  const coursesOverTime = timeSeriesFromMap(range, coursesMap)
  const periodDays = Math.max(1, differenceInCalendarDays(range.to, range.from) + 1)
  const coursesPerDayAvg = coursesInPeriod.length / periodDays
  const avgCapacity = coursesInPeriod.length ? capSum / coursesInPeriod.length : 0
  const avgSeatsTaken = coursesInPeriod.length ? seatsSum / coursesInPeriod.length : 0
  const activeClasses = [...classesById.values()].filter((c) => c.is_active !== false).length
  const activeCategories = [...categoriesById.values()].filter((c) => c.is_active !== false).length
  const durations = coursesInPeriod.map((c) => {
    const cls = classesById.get(c.class_id)
    return num(cls?.duration) || 0
  }).filter((d) => d > 0)
  const avgDurationMinutes = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
  const weekendCourseShare = weekend + weekday > 0 ? (weekend / (weekend + weekday)) * 100 : 0
  const fillOverTime: TimePoint[] = timeSeriesFromMap(
    range,
    new Map(
      [...fillTrendMap.entries()].map(([k, v]) => [k, v.n ? v.sum / v.n : 0] as [string, number]),
    ),
  )
  const courseCancelRateTrend: TimePoint[] = timeSeriesFromMap(
    range,
    new Map(
      [...cancelTrendMap.entries()].map(
        ([k, v]) => [k, v.total ? (v.cancelled / v.total) * 100 : 0] as [string, number],
      ),
    ),
  )
  const timeOfDayMix = [...todMix.entries()].map(([name, value]) => ({ name, value }))
  const weekendVsWeekday: NamedCount[] = [
    { name: "Weekday", value: weekday },
    { name: "Weekend", value: weekend },
  ]
  const classPopularity = countBy(
    nonCancelled.filter(
      (r) => r.status === "attended" || checkinsInRange.some((c) => c.registration_id === r.id),
    ),
    (r) => {
      const course = courses.find((c) => c.id === r.course_id)
      return course ? classesById.get(course.class_id)?.name || "Unknown" : "Unknown"
    },
  ).slice(0, 12)
  const categoryPopularity = countBy(
    nonCancelled.filter(
      (r) => r.status === "attended" || checkinsInRange.some((c) => c.registration_id === r.id),
    ),
    (r) => {
      const course = courses.find((c) => c.id === r.course_id)
      const cls = course ? classesById.get(course.class_id) : null
      return cls ? categoriesById.get(cls.category_id)?.name || "Unknown" : "Unknown"
    },
  ).slice(0, 12)
  const fullClassRows = [...fillRateByClass]
    .filter((r) => r.fillRate >= 95)
    .sort((a, b) => b.fillRate - a.fillRate)
    .slice(0, 15)
  const mostCancelledClasses = [...classCancel.entries()]
    .map(([name, v]) => ({
      name,
      cancelled: v.cancelled,
      total: v.total,
      cancelPct: v.total ? (v.cancelled / v.total) * 100 : 0,
    }))
    .filter((r) => r.cancelled > 0)
    .sort((a, b) => b.cancelled - a.cancelled)
    .slice(0, 15)

  // ---- Subscriptions extended ----
  const startsInPeriod = filteredSubs.filter((s) => inRange(s.start_date || s.created_at, range)).length
  const cancelledInPeriod = filteredSubs.filter(
    (s) => s.status === "cancelled" && inRange(s.updated_at || s.end_date, range),
  ).length
  const expiredInPeriod = filteredSubs.filter(
    (s) => s.status === "expired" && inRange(s.end_date, range),
  ).length
  const activeAtStart = filteredSubs.filter((s) => {
    if (!s.start_date || !s.end_date) return false
    const start = parseISO(String(s.start_date).slice(0, 10))
    const end = parseISO(String(s.end_date).slice(0, 10))
    return start < range.from && end >= range.from && s.status !== "cancelled"
  }).length
  const churnRate =
    activeAtStart + startsInPeriod > 0
      ? (cancelledInPeriod / (activeAtStart + startsInPeriod)) * 100
      : 0

  // renewals proxy: new sub for same member within 7d of a prior end
  let renewalsProxy = 0
  const subsByMember = new Map<string, any[]>()
  for (const s of filteredSubs) {
    const id = String(s.member_id)
    const list = subsByMember.get(id) || []
    list.push(s)
    subsByMember.set(id, list)
  }
  for (const list of subsByMember.values()) {
    const sorted = [...list].sort((a, b) =>
      String(a.start_date).localeCompare(String(b.start_date)),
    )
    for (let i = 1; i < sorted.length; i++) {
      if (!inRange(sorted[i].start_date, range)) continue
      const prevEnd = parseISO(String(sorted[i - 1].end_date).slice(0, 10))
      const start = parseISO(String(sorted[i].start_date).slice(0, 10))
      const gap = differenceInCalendarDays(start, prevEnd)
      if (gap >= 0 && gap <= 7) renewalsProxy++
    }
  }

  const expiryDays = activeSubs
    .map((s) => daysUntil(s.end_date))
    .filter((d) => d >= 0)
  const avgDaysToExpiry = expiryDays.length
    ? expiryDays.reduce((a, b) => a + b, 0) / expiryDays.length
    : null
  const expiring7 = activeSubs.filter((s) => {
    const d = daysUntil(s.end_date)
    return d >= 0 && d <= 7
  }).length
  const expiring30 = activeSubs.filter((s) => {
    const d = daysUntil(s.end_date)
    return d >= 0 && d <= 30
  }).length

  const activeSubIds = new Set(activeSubs.map((s) => s.id))
  const seatsOnActive = seats.filter((s) => activeSubIds.has(s.subscription_id))
  const activeSeats = seatsOnActive.filter((s) => s.status === "active")
  const ownerSeats = activeSeats.filter((s) => s.role === "owner").length
  const memberSeats = activeSeats.filter((s) => s.role === "member").length
  let openSeats = 0
  const multiSeatRows: any[] = []
  const openSeatRows: any[] = []
  for (const sub of activeSubs) {
    const plan = plansById.get(sub.plan_id)
    const maxSeats = num(plan?.max_seats) || 1
    const used = seatsOnActive.filter(
      (s) => s.subscription_id === sub.id && s.status === "active",
    ).length
    if (maxSeats > 1) {
      openSeats += Math.max(0, maxSeats - used)
      const owner = seatsOnActive.find(
        (s) => s.subscription_id === sub.id && s.role === "owner",
      )
      multiSeatRows.push({
        planName: plan?.name || "Unknown",
        seatsUsed: used,
        maxSeats,
        ownerName: profileName(membersById.get(String(owner?.member_id || sub.member_id))?.profile),
      })
      if (maxSeats - used > 0) {
        openSeatRows.push({
          planName: plan?.name || "Unknown",
          open: maxSeats - used,
          maxSeats,
        })
      }
    }
  }
  const seatCapacity = activeSubs.reduce((s, sub) => s + (num(plansById.get(sub.plan_id)?.max_seats) || 1), 0)
  const seatUtilization = seatCapacity > 0 ? (activeSeats.length / seatCapacity) * 100 : 0
  const avgSeatsPerSub = activeSubs.length ? activeSeats.length / activeSubs.length : 0
  const seatStats = {
    totalSeats: seatsOnActive.length,
    activeSeats: activeSeats.length,
    ownerSeats,
    memberSeats,
    utilization: seatUtilization,
    avgSeatsPerSub,
    openSeats,
  }
  const seatRoles: NamedCount[] = [
    { name: "Owner", value: ownerSeats },
    { name: "Member", value: memberSeats },
  ]

  const inviteStats = {
    pending: invites.filter((i) => i.status === "pending").length,
    accepted: invites.filter((i) => i.status === "accepted").length,
    revoked: invites.filter((i) => i.status === "revoked").length,
    expired: invites.filter((i) => i.status === "expired").length,
  }
  const inviteStatusMix = Object.entries(inviteStats).map(([name, value]) => ({
    name,
    value,
  }))
  const invitesCreated = invites.filter((i) => inRange(i.created_at, range))
  const invitesOverTime = timeSeriesFromMap(
    range,
    sumMapIntoBuckets(
      range,
      invitesCreated.map((i) => ({ date: i.created_at, amount: 1 })),
    ),
  )
  const inviteAcceptRate =
    inviteStats.pending + inviteStats.accepted > 0
      ? (inviteStats.accepted / (inviteStats.pending + inviteStats.accepted)) * 100
      : 0
  const inviteExpiryRisk = invites.filter((i) => {
    if (i.status !== "pending" || !i.expires_at) return false
    const d = daysUntil(i.expires_at)
    return d >= 0 && d <= 7
  }).length
  const pendingInviteRows = invites
    .filter((i) => i.status === "pending")
    .slice(0, 20)
    .map((i) => {
      const sub = subscriptions.find((s) => s.id === i.subscription_id)
      const plan = sub ? plansById.get(sub.plan_id) : null
      return {
        email: i.email || "",
        planName: plan?.name || "Unknown",
        expiresAt: String(i.expires_at || "").slice(0, 10),
      }
    })

  let freePlanCount = 0
  let paidPlanCount = 0
  let multiSeatCount = 0
  const priceBands = new Map<string, number>()
  const durMix = new Map<string, number>()
  for (const s of activeSubs) {
    const plan = plansById.get(s.plan_id)
    if (plan?.is_free) freePlanCount++
    else paidPlanCount++
    if (num(plan?.max_seats) > 1) multiSeatCount++
    const pb = priceBand(num(plan?.price))
    priceBands.set(pb, (priceBands.get(pb) || 0) + 1)
    const db = durationBand(num(plan?.duration_days) || 0)
    durMix.set(db, (durMix.get(db) || 0) + 1)
  }
  const planPriceBands = [...priceBands.entries()].map(([name, value]) => ({ name, value }))
  const durationMix = [...durMix.entries()].map(([name, value]) => ({ name, value }))
  const freeVsPaidPlans: NamedCount[] = [
    { name: "Free", value: freePlanCount },
    { name: "Paid", value: paidPlanCount },
  ]
  const expiringBuckets: NamedCount[] = [
    { name: "≤7d", value: expiring7 },
    { name: "8–14d", value: activeSubs.filter((s) => { const d = daysUntil(s.end_date); return d >= 8 && d <= 14 }).length },
    { name: "15–30d", value: activeSubs.filter((s) => { const d = daysUntil(s.end_date); return d >= 15 && d <= 30 }).length },
    { name: "30d+", value: activeSubs.filter((s) => daysUntil(s.end_date) > 30).length },
  ]
  const startsOverTime = timeSeriesFromMap(
    range,
    sumMapIntoBuckets(
      range,
      filteredSubs
        .filter((s) => inRange(s.start_date || s.created_at, range))
        .map((s) => ({ date: s.start_date || s.created_at, amount: 1 })),
    ),
  )
  const cancelsOverTime = timeSeriesFromMap(
    range,
    sumMapIntoBuckets(
      range,
      filteredSubs
        .filter((s) => s.status === "cancelled" && inRange(s.updated_at || s.end_date, range))
        .map((s) => ({ date: s.updated_at || s.end_date, amount: 1 })),
    ),
  )
  const totalSessions = sgs.reduce((s, g) => s + num(g.sessions_total ?? g.total_sessions ?? g.total), 0)
  const remainingSessions = sgs.reduce(
    (s, g) => s + num(g.sessions_remaining ?? g.remaining),
    0,
  )
  const usedSessions = Math.max(0, totalSessions - remainingSessions)
  const sessionBurnRate = totalSessions > 0 ? (usedSessions / totalSessions) * 100 : 0
  const firstTimeSubscribers = [...subsByMember.entries()].filter(([, list]) => {
    const first = [...list].sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0]
    return first && inRange(first.start_date || first.created_at, range)
  }).length
  const expiring30List = activeSubs
    .map((s) => {
      const days = daysUntil(s.end_date)
      const plan = plansById.get(s.plan_id)
      return {
        id: s.id,
        memberName: profileName(membersById.get(String(s.member_id))?.profile),
        planName: plan?.name || "Unknown",
        endDate: String(s.end_date || "").slice(0, 10),
        daysLeft: days,
      }
    })
    .filter((r) => r.daysLeft >= 0 && r.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 25)

  // ---- Trainers extended ----
  const activeTrainerCount = trainersRaw.filter((t) => t.status === "active").length
  const inactiveTrainerCount = trainersRaw.filter((t) => t.status !== "active").length
  const trainerRows = [...trainersById.entries()].map(([id, t]) => {
    const tCoursesAll = filteredCourses.filter(
      (c) => String(c.trainer_id) === id && inRange(c.course_date, range),
    )
    const tCourses = tCoursesAll.filter((c) => c.status !== "cancelled")
    const tCancelled = tCoursesAll.filter((c) => c.status === "cancelled").length
    const tRegs = regsInRange.filter((r) => tCoursesAll.some((c) => c.id === r.course_id))
    const tNonCancel = tRegs.filter((r) => r.status !== "cancelled")
    const tAttended = tNonCancel.filter(
      (r) =>
        r.status === "attended" || checkinsInRange.some((ch) => ch.registration_id === r.id),
    )
    const tNoShows = tRegs.filter((r) => r.status === "absent").length
    let fill = 0
    let hours = 0
    for (const c of tCourses) {
      const cap = num(c.max_participants) || 1
      const fromRegs = tNonCancel.filter((r) => r.course_id === c.id).length
      const filled = Math.max(num(c.current_participants), fromRegs)
      fill += (Math.min(filled, cap) / cap) * 100
      const cls = classesById.get(c.class_id)
      hours += (num(cls?.duration) || 0) / 60
    }
    return {
      id,
      name: t.name,
      courses: tCourses.length,
      uniqueAttendees: new Set(tAttended.map((r) => r.member_id)).size,
      attendanceRate: tNonCancel.length ? (tAttended.length / tNonCancel.length) * 100 : 0,
      fillRate: tCourses.length ? fill / tCourses.length : 0,
      cancelledCourses: tCancelled,
      registrations: tRegs.length,
      noShows: tNoShows,
      hoursProxy: hours,
    }
  }).sort((a, b) => b.courses - a.courses)

  const withCourses = trainerRows.filter((r) => r.courses > 0)
  const avgCoursesPerTrainer = trainerRows.length
    ? trainerRows.reduce((s, r) => s + r.courses, 0) / trainerRows.length
    : 0
  const avgTrainerFill = withCourses.length
    ? withCourses.reduce((s, r) => s + r.fillRate, 0) / withCourses.length
    : 0
  const avgTrainerAttendance = withCourses.length
    ? withCourses.reduce((s, r) => s + r.attendanceRate, 0) / withCourses.length
    : 0
  const avgTrainerHours = trainerRows.length
    ? trainerRows.reduce((s, r) => s + r.hoursProxy, 0) / trainerRows.length
    : 0
  const trainersWithZeroCourses = trainerRows.filter((r) => r.courses === 0).length
  const specializationMix = countBy(
    trainersRaw.filter((t) => t.specialization),
    (t) => t.specialization,
  )
  const experienceBands = countBy(trainersRaw, (t) => experienceBand(num(t.experience_years)))
  const cancellationRows = trainerRows
    .filter((r) => r.cancelledCourses > 0)
    .map((r) => ({
      name: r.name,
      cancelled: r.cancelledCourses,
      total: r.courses + r.cancelledCourses,
      cancelPct:
        r.courses + r.cancelledCourses > 0
          ? (r.cancelledCourses / (r.courses + r.cancelledCourses)) * 100
          : 0,
    }))
  const idleTrainers = trainerRows
    .filter((r) => r.courses === 0)
    .map((r) => ({ id: r.id, name: r.name }))

  return {
    membersExt: {
      ageBuckets,
      avgAge: avgAge != null ? Math.round(avgAge * 10) / 10 : null,
      medianAge: medianAge != null ? Math.round(medianAge * 10) / 10 : null,
      blacklistCount,
      guestTotal,
      inactiveCount,
      suspendedCount,
      returningBookers,
      oneTimeBookers,
      zeroActivityMembers,
      membersWithCredit,
      avgCreditBalance: Math.round(avgCreditBalance * 100) / 100,
      accountStatusMix,
      neverLoggedIn,
      staleLogins,
      phoneMissing,
      emailMissing,
      joinsByWeekday,
      creditHoldersMix,
      newestMembers,
      dormantActives,
      topCreditWallets,
      blacklistRows,
    },
    financesExt: {
      creditIssued: Math.round(creditIssued * 100) / 100,
      creditUsed: Math.round(creditUsed * 100) / 100,
      creditNet: Math.round(creditNet * 100) / 100,
      creditOverTime,
      creditByType,
      paymentStatusMix,
      failedAmount: Math.round(failedAmount * 100) / 100,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      grossPaid: Math.round(grossPaid * 100) / 100,
      discountRate: Math.round(discountRate * 10) / 10,
      netRevenue: Math.round(netRevenue * 100) / 100,
      revenueByWeekday,
      topPayers,
      avgDaysToPay: avgDaysToPay != null ? Math.round(avgDaysToPay * 10) / 10 : null,
      freeVsPaidRevenue,
      revenueByPlanDuration,
      outstandingAging,
      largestDiscounts,
      overduePayments: overduePaymentRows,
      failedPayments: failedPaymentRows,
      mrrProxy: Math.round(mrrProxy * 100) / 100,
      revenuePerVisit: Math.round(revenuePerVisit * 100) / 100,
      revenuePerCourse: Math.round(revenuePerCourse * 100) / 100,
      partialCreditPays,
    },
    attendanceExt: {
      byGroup,
      noShowRate: Math.round(noShowRate * 10) / 10,
      cancelRate: Math.round(cancelRate * 10) / 10,
      regStatusMix,
      sessionSourceMix,
      checkinConversion: Math.round(checkinConversion * 10) / 10,
      regsPerActiveMember: Math.round(regsPerActiveMember * 100) / 100,
      uniqueBookers,
      uniqueCheckinMembers,
      repeatVisitRate: Math.round(repeatVisitRate * 10) / 10,
      attendanceByWeekday,
      attendanceByHour,
      avgLeadTimeDays: avgLeadTimeDays != null ? Math.round(avgLeadTimeDays * 10) / 10 : null,
      sameDayBookingRate: Math.round(sameDayBookingRate * 10) / 10,
      advanceBookings7dRate: Math.round(advanceBookings7dRate * 10) / 10,
      multiClassMembers,
      poolRegs,
      dedicatedRegs,
      guestLikeRegs,
      checkinsWithoutSessionConsumed,
      leadTimeBuckets,
      frequentAttendees,
      chronicNoShows,
    },
    programExt: {
      fillByCategory,
      coursesOverTime,
      avgCapacity: Math.round(avgCapacity * 10) / 10,
      avgSeatsTaken: Math.round(avgSeatsTaken * 10) / 10,
      emptyCourses,
      fullCourses,
      underfilledCourses,
      coursesPerDayAvg: Math.round(coursesPerDayAvg * 100) / 100,
      activeClasses,
      activeCategories,
      avgDurationMinutes: Math.round(avgDurationMinutes * 10) / 10,
      weekendCourseShare: Math.round(weekendCourseShare * 10) / 10,
      fillOverTime,
      timeOfDayMix,
      weekendVsWeekday,
      classPopularity,
      categoryPopularity,
      courseCancelRateTrend,
      emptyCourseRows: emptyCourseRows.slice(0, 20),
      fullClassRows,
      mostCancelledClasses,
    },
    subscriptionsExt: {
      startsInPeriod,
      cancelledInPeriod,
      expiredInPeriod,
      churnRate: Math.round(churnRate * 10) / 10,
      renewalsProxy,
      avgDaysToExpiry: avgDaysToExpiry != null ? Math.round(avgDaysToExpiry * 10) / 10 : null,
      expiring7,
      expiring30,
      seatStats,
      inviteStats,
      invitesOverTime,
      inviteAcceptRate: Math.round(inviteAcceptRate * 10) / 10,
      inviteExpiryRisk,
      freePlanCount,
      paidPlanCount,
      multiSeatCount,
      sessionBurnRate: Math.round(sessionBurnRate * 10) / 10,
      firstTimeSubscribers,
      planPriceBands,
      durationMix,
      freeVsPaidPlans,
      expiringBuckets,
      startsOverTime,
      cancelsOverTime,
      seatRoles,
      inviteStatusMix,
      multiSeatRows: multiSeatRows.slice(0, 20),
      pendingInviteRows,
      openSeatRows: openSeatRows.slice(0, 20),
      expiring30List,
    },
    trainersExt: {
      rows: trainerRows,
      activeTrainerCount,
      inactiveTrainerCount,
      avgCoursesPerTrainer: Math.round(avgCoursesPerTrainer * 10) / 10,
      avgTrainerFill: Math.round(avgTrainerFill * 10) / 10,
      avgTrainerAttendance: Math.round(avgTrainerAttendance * 10) / 10,
      avgTrainerHours: Math.round(avgTrainerHours * 10) / 10,
      trainersWithZeroCourses,
      specializationMix,
      experienceBands,
      cancellationRows,
      idleTrainers,
    },
    overviewExt: {
      discountTotal: Math.round(discountTotal * 100) / 100,
      discountRate: Math.round(discountRate * 10) / 10,
      arpu: 0, // filled by caller
      creditNet: Math.round(creditNet * 100) / 100,
      noShowRate: Math.round(noShowRate * 10) / 10,
      cancelRate: Math.round(cancelRate * 10) / 10,
      checkinConversion: Math.round(checkinConversion * 10) / 10,
      churnRate: Math.round(churnRate * 10) / 10,
      seatUtilization: Math.round(seatUtilization * 10) / 10,
      sessionBurnRate: Math.round(sessionBurnRate * 10) / 10,
      freePlanSubs: freePlanCount,
      paidPlanSubs: paidPlanCount,
      multiSeatSubs: multiSeatCount,
      mrrProxy: Math.round(mrrProxy * 100) / 100,
      revenuePerVisit: Math.round(revenuePerVisit * 100) / 100,
      revenuePerCourse: Math.round(revenuePerCourse * 100) / 100,
      registrations: regsInRange.length,
      checkins: checkinCount,
      attended: attendedCount,
      capacityWaste,
    },
    rawExt: {
      creditNet,
      churnRate,
      seatUtilization,
      netRevenue,
      noShowRate,
      checkinConversion,
    },
  }
}
