import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns';
import type {
  KpiValue,
  NamedCount,
  RatePoint,
  TimePoint,
} from '@/lib/api/stats';

export type DateRange = { from: Date; to: Date };

export function parseRange(fromStr: string, toStr: string): DateRange {
  return {
    from: startOfDay(parseISO(fromStr)),
    to: endOfDay(parseISO(toStr)),
  };
}

export function previousRange(range: DateRange): DateRange {
  const days = Math.max(1, differenceInCalendarDays(range.to, range.from) + 1);
  const prevTo = endOfDay(subDays(range.from, 1));
  const prevFrom = startOfDay(subDays(prevTo, days - 1));
  return { from: prevFrom, to: prevTo };
}

export function formatDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d.slice(0, 10)) : d;
  return format(date, 'yyyy-MM-dd');
}

export function inRange(dateStr: string | null | undefined, range: DateRange): boolean {
  if (!dateStr) return false;
  const d = parseISO(dateStr.slice(0, 10));
  return d >= range.from && d <= range.to;
}

/** Inclusive date-range overlap (subscription / membership windows). */
export function overlapsRange(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  range: DateRange,
): boolean {
  if (!startStr || !endStr) return false;
  const start = startOfDay(parseISO(startStr.slice(0, 10)));
  const end = endOfDay(parseISO(endStr.slice(0, 10)));
  return start <= range.to && end >= range.from;
}

export function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function kpi(current: number, previous?: number): KpiValue {
  if (previous === undefined) return { value: current };
  let deltaPct: number | null = null;
  if (previous === 0) {
    deltaPct = current === 0 ? 0 : null;
  } else {
    deltaPct = ((current - previous) / Math.abs(previous)) * 100;
  }
  return { value: current, previous, deltaPct };
}

/** Align previous-period series onto current buckets by index (not calendar date). */
export function alignPreviousOntoCurrent<T extends { value: number }>(
  current: T[],
  previous: Array<{ value: number }>,
): Array<T & { previous?: number }> {
  return current.map((point, i) => ({
    ...point,
    previous: previous[i]?.value,
  }));
}

export function alignPreviousRates(
  current: Array<{ date: string; attendance: number; noShow: number; cancel: number }>,
  previous: Array<{ attendance: number; noShow: number; cancel: number }>,
) {
  return current.map((point, i) => ({
    ...point,
    previousAttendance: previous[i]?.attendance,
    previousNoShow: previous[i]?.noShow,
    previousCancel: previous[i]?.cancel,
  }));
}

export function bucketGranularity(range: DateRange): 'day' | 'week' {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  return days > 45 ? 'week' : 'day';
}

export function emptyBuckets(range: DateRange): string[] {
  const gran = bucketGranularity(range);
  if (gran === 'day') {
    return eachDayOfInterval({ start: range.from, end: range.to }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );
  }
  return eachWeekOfInterval(
    { start: range.from, end: range.to },
    { weekStartsOn: 1 },
  ).map((d) => format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
}

export function toBucketKey(dateStr: string, range: DateRange): string {
  const gran = bucketGranularity(range);
  const d = parseISO(dateStr.slice(0, 10));
  if (gran === 'day') return format(d, 'yyyy-MM-dd');
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function timeSeriesFromMap(
  range: DateRange,
  map: Map<string, number>,
  secondary?: Map<string, number>,
): TimePoint[] {
  return emptyBuckets(range).map((date) => ({
    date,
    value: map.get(date) ?? 0,
    ...(secondary ? { secondary: secondary.get(date) ?? 0 } : {}),
  }));
}

export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn?: (item: T) => number,
): NamedCount[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || 'Unknown';
    map.set(key, (map.get(key) ?? 0) + (valueFn ? valueFn(item) : 1));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function sumMapIntoBuckets(
  range: DateRange,
  dates: Array<{ date: string; amount: number }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const { date, amount } of dates) {
    if (!inRange(date, range)) continue;
    const key = toBucketKey(date, range);
    map.set(key, (map.get(key) ?? 0) + amount);
  }
  return map;
}

export function profileName(profile?: {
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
} | null): string {
  if (!profile) return 'Unknown';
  const first = profile.first_name || profile.firstName || '';
  const last = profile.last_name || profile.lastName || '';
  const name = `${first} ${last}`.trim();
  return name || 'Unknown';
}

export function dayOfWeekLabel(dow: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow] ?? String(dow);
}

export function buildRatesOverTime(
  range: DateRange,
  regs: Array<{ date: string; status: string }>,
): RatePoint[] {
  const buckets = emptyBuckets(range);
  const stats = new Map<string, { attended: number; absent: number; cancelled: number; total: number }>();
  for (const b of buckets) {
    stats.set(b, { attended: 0, absent: 0, cancelled: 0, total: 0 });
  }
  for (const r of regs) {
    if (!inRange(r.date, range)) continue;
    const key = toBucketKey(r.date, range);
    const s = stats.get(key);
    if (!s) continue;
    s.total += 1;
    if (r.status === 'attended') s.attended += 1;
    else if (r.status === 'absent') s.absent += 1;
    else if (r.status === 'cancelled') s.cancelled += 1;
  }
  return buckets.map((date) => {
    const s = stats.get(date)!;
    const denom = s.total || 1;
    return {
      date,
      attendance: (s.attended / denom) * 100,
      noShow: (s.absent / denom) * 100,
      cancel: (s.cancelled / denom) * 100,
    };
  });
}

export function daysUntil(endDate: string, from = new Date()): number {
  return differenceInCalendarDays(parseISO(endDate.slice(0, 10)), startOfDay(from));
}

export function addDaysIso(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr.slice(0, 10)), days), 'yyyy-MM-dd');
}
