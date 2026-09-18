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
  creditNet: KpiValue;
  churnRate: KpiValue;
  seatUtilization: KpiValue;
  netRevenue: KpiValue;
  noShowRate: KpiValue;
  checkinConversion: KpiValue;
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
  // extended overview KPIs (flat numbers for catalog)
  discountTotal: number;
  discountRate: number;
  arpu: number;
  creditNet: number;
  noShowRate: number;
  cancelRate: number;
  checkinConversion: number;
  churnRate: number;
  seatUtilization: number;
  sessionBurnRate: number;
  freePlanSubs: number;
  paidPlanSubs: number;
  multiSeatSubs: number;
  mrrProxy: number;
  revenuePerVisit: number;
  revenuePerCourse: number;
  registrations: number;
  checkins: number;
  attended: number;
  capacityWaste: number;
};

export type StatsMembers = {
  growth: TimePoint[];
  composition: TimePoint[];
  newMemberRetention: TimePoint[];
  retention3Mo: { rate: number; mature: number; stuck: number };
  statusBreakdown: NamedCount[];
  linkedVsUnlinked: NamedCount[];
  topGuests: Array<{ id: string; name: string; guestCount: number }>;
  professions: NamedCount[];
  ageBuckets: NamedCount[];
  avgAge: number | null;
  medianAge: number | null;
  blacklistCount: number;
  guestTotal: number;
  inactiveCount: number;
  suspendedCount: number;
  returningBookers: number;
  oneTimeBookers: number;
  zeroActivityMembers: number;
  membersWithCredit: number;
  avgCreditBalance: number;
  accountStatusMix: NamedCount[];
  neverLoggedIn: number;
  staleLogins: number;
  phoneMissing: number;
  emailMissing: number;
  joinsByWeekday: NamedCount[];
  creditHoldersMix: NamedCount[];
  newestMembers: Array<{ id: string; name: string; joined: string; status: string }>;
  dormantActives: Array<{ id: string; name: string; status: string }>;
  topCreditWallets: Array<{ id: string; name: string; credit: number }>;
  blacklistRows: Array<{ id: string; name: string }>;
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
  creditIssued: number;
  creditUsed: number;
  creditNet: number;
  creditOverTime: TimePoint[];
  creditByType: NamedCount[];
  paymentStatusMix: NamedCount[];
  failedAmount: number;
  refundedAmount: number;
  pendingAmount: number;
  grossPaid: number;
  discountRate: number;
  netRevenue: number;
  revenueByWeekday: NamedCount[];
  topPayers: Array<{ id: string; name: string; amount: number }>;
  avgDaysToPay: number | null;
  freeVsPaidRevenue: NamedCount[];
  revenueByPlanDuration: NamedCount[];
  outstandingAging: NamedCount[];
  largestDiscounts: Array<{ memberName: string; amount: number; discount: number }>;
  overduePayments: Array<{ memberName: string; amount: number; dueDate: string; daysLate: number }>;
  failedPayments: Array<{ memberName: string; amount: number; date: string }>;
  mrrProxy: number;
  revenuePerVisit: number;
  revenuePerCourse: number;
  partialCreditPays: number;
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
  byGroup: NamedCount[];
  noShowRate: number;
  cancelRate: number;
  regStatusMix: NamedCount[];
  sessionSourceMix: NamedCount[];
  checkinConversion: number;
  regsPerActiveMember: number;
  uniqueBookers: number;
  uniqueCheckinMembers: number;
  repeatVisitRate: number;
  attendanceByWeekday: NamedCount[];
  attendanceByHour: NamedCount[];
  avgLeadTimeDays: number | null;
  sameDayBookingRate: number;
  advanceBookings7dRate: number;
  multiClassMembers: number;
  poolRegs: number;
  dedicatedRegs: number;
  guestLikeRegs: number;
  checkinsWithoutSessionConsumed: number;
  leadTimeBuckets: NamedCount[];
  frequentAttendees: Array<{ id: string; name: string; attended: number; checkins: number }>;
  chronicNoShows: Array<{ id: string; name: string; absent: number }>;
};

export type StatsProgram = {
  fillRateByClass: Array<{ name: string; fillRate: number; seats: number; capacity: number }>;
  cancelledCourses: number;
  capacityWaste: number;
  completedCourses: number;
  scheduledCourses: number;
  statusBreakdown: NamedCount[];
  fillByCategory: NamedCount[];
  coursesOverTime: TimePoint[];
  avgCapacity: number;
  avgSeatsTaken: number;
  emptyCourses: number;
  fullCourses: number;
  underfilledCourses: number;
  coursesPerDayAvg: number;
  activeClasses: number;
  activeCategories: number;
  avgDurationMinutes: number;
  weekendCourseShare: number;
  fillOverTime: TimePoint[];
  timeOfDayMix: NamedCount[];
  weekendVsWeekday: NamedCount[];
  classPopularity: NamedCount[];
  categoryPopularity: NamedCount[];
  courseCancelRateTrend: TimePoint[];
  emptyCourseRows: Array<{ date: string; className: string; trainerName: string; seats: number; capacity: number }>;
  fullClassRows: Array<{ name: string; fillRate: number; seats: number; capacity: number }>;
  mostCancelledClasses: Array<{ name: string; cancelled: number; total: number; cancelPct: number }>;
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
  startsInPeriod: number;
  cancelledInPeriod: number;
  expiredInPeriod: number;
  churnRate: number;
  renewalsProxy: number;
  avgDaysToExpiry: number | null;
  expiring7: number;
  expiring30: number;
  seatStats: {
    totalSeats: number;
    activeSeats: number;
    ownerSeats: number;
    memberSeats: number;
    utilization: number;
    avgSeatsPerSub: number;
    openSeats: number;
  };
  inviteStats: { pending: number; accepted: number; revoked: number; expired: number };
  invitesOverTime: TimePoint[];
  inviteAcceptRate: number;
  inviteExpiryRisk: number;
  freePlanCount: number;
  paidPlanCount: number;
  multiSeatCount: number;
  sessionBurnRate: number;
  firstTimeSubscribers: number;
  planPriceBands: NamedCount[];
  durationMix: NamedCount[];
  freeVsPaidPlans: NamedCount[];
  expiringBuckets: NamedCount[];
  startsOverTime: TimePoint[];
  cancelsOverTime: TimePoint[];
  seatRoles: NamedCount[];
  inviteStatusMix: NamedCount[];
  multiSeatRows: Array<{ planName: string; seatsUsed: number; maxSeats: number; ownerName: string }>;
  pendingInviteRows: Array<{ email: string; planName: string; expiresAt: string }>;
  openSeatRows: Array<{ planName: string; open: number; maxSeats: number }>;
  expiring30List: Array<{
    id: number;
    memberName: string;
    planName: string;
    endDate: string;
    daysLeft: number;
  }>;
};

export type StatsTrainers = {
  rows: Array<{
    id: string;
    name: string;
    courses: number;
    uniqueAttendees: number;
    attendanceRate: number;
    fillRate: number;
    cancelledCourses: number;
    registrations: number;
    noShows: number;
    hoursProxy: number;
  }>;
  activeTrainerCount: number;
  inactiveTrainerCount: number;
  avgCoursesPerTrainer: number;
  avgTrainerFill: number;
  avgTrainerAttendance: number;
  avgTrainerHours: number;
  trainersWithZeroCourses: number;
  specializationMix: NamedCount[];
  experienceBands: NamedCount[];
  cancellationRows: Array<{ name: string; cancelled: number; total: number; cancelPct: number }>;
  idleTrainers: Array<{ id: string; name: string }>;
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

export type CustomQueryRequest = {
  query: import('@/lib/stats/query-spec').CustomQuerySpec;
  from: string;
  to: string;
  compare?: boolean;
};

export type CustomQueryResult = import('@/lib/stats/query-spec').QueryResultPayload;

export type StatsBoardState = {
  widgets: Array<{
    id: string;
    metricId: string;
    params: Record<string, string>;
    customQuery?: import('@/lib/stats/query-spec').CustomQuerySpec;
  }>;
  layouts: Array<{
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxH?: number;
  }>;
};

export const statsApi = {
  async getStats(filters: StatsFilters): Promise<AdminStatsResponse> {
    return apiRequest('GET', `/api/admin/stats?${toQuery(filters)}`);
  },
  async runCustomQuery(body: CustomQueryRequest): Promise<CustomQueryResult> {
    return apiRequest('POST', '/api/admin/stats/query', body);
  },
  async getBoard(tab: string): Promise<StatsBoardState> {
    return apiRequest('GET', `/api/admin/stats/board?tab=${encodeURIComponent(tab)}`);
  },
  async saveBoard(tab: string, board: StatsBoardState): Promise<StatsBoardState> {
    return apiRequest('PUT', `/api/admin/stats/board?tab=${encodeURIComponent(tab)}`, board);
  },
};
