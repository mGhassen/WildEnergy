import { apiRequest } from '@/lib/queryClient';

export type StatsFilters = {
  from: string;
  to: string;
  compare?: boolean;
  categoryId?: string;
  trainerId?: string;
  planId?: string;
  groupId?: string;
};

export type NamedCount = { name: string; value: number; id?: string | number };
export type TimePoint = {
  date: string;
  value: number;
  secondary?: number;
  /** Previous-period value aligned by index when compare is on */
  previous?: number;
};
export type RatePoint = {
  date: string;
  attendance: number;
  noShow: number;
  cancel: number;
  previousAttendance?: number;
  previousNoShow?: number;
  previousCancel?: number;
};

export type KpiValue = {
  value: number;
  previous?: number;
  deltaPct?: number | null;
};

export type StatsComparisonKpis = {
  paidRevenue: KpiValue;
  avgTicket: KpiValue;
  collectionRate: KpiValue;
  discountTotal: KpiValue;
  arpu: KpiValue;
  paidCount: KpiValue;
  outstandingAmount: KpiValue;
  overdueAmount: KpiValue;
  newMembers: KpiValue;
  activeMembers: KpiValue;
  attendanceRate: KpiValue;
  avgFillRate: KpiValue;
  registrations: KpiValue;
  attended: KpiValue;
  checkins: KpiValue;
  completedCourses: KpiValue;
  cancelledCourses: KpiValue;
  capacityWaste: KpiValue;
  activeSubscriptions: KpiValue;
  expiringSoon: KpiValue;
  depletedActive: KpiValue;
};

export type StatsOverview = {
  totalMembers: number;
  activeMembers: number;
  newMembers: KpiValue;
  paidRevenue: KpiValue;
  outstandingAmount: number;
  overdueAmount: number;
  attendanceRate: KpiValue;
  avgFillRate: KpiValue;
  activeSubscriptions: number;
  expiringSoon: number;
};

export type StatsMembers = {
  growth: TimePoint[];
  statusBreakdown: NamedCount[];
  linkedVsUnlinked: NamedCount[];
  topGuests: Array<{ id: string; name: string; guestCount: number }>;
  professions: NamedCount[];
};

export type StatsFinances = {
  revenueOverTime: TimePoint[];
  byPaymentType: NamedCount[];
  byPlan: NamedCount[];
  collectionRate: number;
  discountTotal: number;
  creditOutstanding: number;
  arpu: number;
  outstandingCount: number;
  overdueCount: number;
  paidCount: number;
  pendingCount: number;
};

export type StatsAttendance = {
  ratesOverTime: RatePoint[];
  volumeOverTime: TimePoint[];
  byClass: NamedCount[];
  byCategory: NamedCount[];
  byTrainer: NamedCount[];
  peakDayOfWeek: NamedCount[];
  peakHour: NamedCount[];
  totals: {
    registrations: number;
    attended: number;
    absent: number;
    cancelled: number;
    checkins: number;
  };
};

export type StatsProgram = {
  fillRateByClass: Array<{ name: string; fillRate: number; seats: number; capacity: number }>;
  cancelledCourses: number;
  capacityWaste: number;
  completedCourses: number;
  scheduledCourses: number;
  statusBreakdown: NamedCount[];
};

export type StatsSubscriptions = {
  statusMix: NamedCount[];
  planMix: Array<{ name: string; count: number; revenue: number }>;
  expiringSoon: Array<{
    id: number;
    memberName: string;
    planName: string;
    endDate: string;
    daysLeft: number;
  }>;
  sessionUtilization: Array<{
    groupId: number;
    groupName: string;
    total: number;
    remaining: number;
    used: number;
    utilization: number;
  }>;
  depletedActive: number;
};

export type StatsTrainers = {
  rows: Array<{
    id: string;
    name: string;
    courses: number;
    uniqueAttendees: number;
    attendanceRate: number;
    fillRate: number;
  }>;
};

export type StatsAcquisition = {
  discoverySources: NamedCount[];
  funnel: NamedCount[];
  pendingAccounts: number;
};

export type StatsMeta = {
  from: string;
  to: string;
  previousFrom?: string;
  previousTo?: string;
  compare: boolean;
  filters: {
    categoryId?: string;
    trainerId?: string;
    planId?: string;
    groupId?: string;
  };
};

export type StatsFilterOptions = {
  categories: Array<{ id: number; name: string }>;
  trainers: Array<{ id: string; name: string }>;
  plans: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
};

export type AdminStatsResponse = {
  meta: StatsMeta;
  options: StatsFilterOptions;
  overview: StatsOverview;
  members: StatsMembers;
  finances: StatsFinances;
  attendance: StatsAttendance;
  program: StatsProgram;
  subscriptions: StatsSubscriptions;
  trainers: StatsTrainers;
  acquisition: StatsAcquisition;
  /** Present when compare=1 — KPI deltas + previous series are also merged into chart points */
  comparison?: {
    previousFrom: string;
    previousTo: string;
    kpis: StatsComparisonKpis;
  };
};

function toQuery(filters: StatsFilters): string {
  const params = new URLSearchParams();
  params.set('from', filters.from);
  params.set('to', filters.to);
  if (filters.compare) params.set('compare', '1');
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.trainerId) params.set('trainerId', filters.trainerId);
  if (filters.planId) params.set('planId', filters.planId);
  if (filters.groupId) params.set('groupId', filters.groupId);
  return params.toString();
}

export const statsApi = {
  async getStats(filters: StatsFilters): Promise<AdminStatsResponse> {
    return apiRequest('GET', `/api/admin/stats?${toQuery(filters)}`);
  },
};
