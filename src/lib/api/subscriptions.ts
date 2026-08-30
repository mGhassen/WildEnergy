import { apiRequest } from '@/lib/queryClient';
import { isSubscriptionActiveByEndDate } from '@/lib/date';

export interface SubscriptionGroupSession {
  id: number;
  group_id: number;
  sessions_remaining: number;
  total_sessions: number;
  group?: {
    id: number;
    name: string;
    description?: string;
    color?: string;
  } | null;
  groups?: {
    id: number;
    name: string;
    description?: string;
    color?: string;
  } | null;
}

export interface SubscriptionPoolSession {
  id: number;
  pool_id: number;
  sessions_remaining: number;
  total_sessions: number;
  plan_session_pools?: {
    id: number;
    session_count: number;
    is_free?: boolean;
    plan_session_pool_groups?: Array<{
      group_id: number;
      groups?: {
        id: number;
        name: string;
        description?: string;
        color?: string;
      } | null;
    }>;
  } | null;
}

export interface Subscription {
  id: number;
  member_id: string;
  plan_id: number;
  status: string;
  start_date: string;
  end_date: string;
  notes?: string;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  plan?: {
    id: number;
    name: string;
    price: number;
    duration_days: number;
    sessions_included: number;
  };
  subscription_group_sessions?: SubscriptionGroupSession[];
  subscription_pool_sessions?: SubscriptionPoolSession[];
  registrations?: SubscriptionRegistration[];
}

export interface SubscriptionRegistration {
  id: number;
  status: string;
  registration_date: string;
  notes?: string | null;
  qr_code?: string;
  subscription_id?: number | null;
  session_source?: 'dedicated' | 'pool' | null;
  group_id?: number | null;
  pool_id?: number | null;
  course?: {
    id: number;
    course_date: string;
    start_time?: string;
    end_time?: string;
    class?: { id: number; name: string } | null;
  } | null;
  checkins?: Array<{ id: number; checkin_time: string }>;
  group?: { id: number; name: string; color?: string } | null;
  pool?: {
    id: number;
    plan_session_pool_groups?: Array<{
      group_id: number;
      groups?: { id: number; name: string; color?: string } | null;
    }>;
  } | null;
}

export interface CreateSubscriptionData {
  member_id: string;
  plan_id: number;
  status?: string;
  start_date: string;
  end_date: string;
  notes?: string;
  payment_method?: string;
  payment_reference?: string;
}

export interface UpdateSubscriptionData {
  member_id?: string; // Changed from number to string to match API expectations
  plan_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  payment_method?: string;
  payment_reference?: string;
}

export const subscriptionApi = {
  async getSubscriptions(): Promise<Subscription[]> {
    return apiRequest('GET', '/api/admin/subscriptions');
  },

  async getSubscription(subscriptionId: number): Promise<Subscription> {
    return apiRequest('GET', `/api/admin/subscriptions/${subscriptionId}`);
  },

  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    return apiRequest('POST', '/api/admin/subscriptions', data);
  },

  async updateSubscription(subscriptionId: number, data: UpdateSubscriptionData): Promise<Subscription> {
    return apiRequest('PUT', `/api/admin/subscriptions/${subscriptionId}`, data);
  },

  async deleteSubscription(subscriptionId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/subscriptions/${subscriptionId}`);
  },

  async getMemberSubscriptions(): Promise<Subscription[]> {
    return apiRequest('GET', '/api/member/subscriptions');
  },

  async getMemberSubscription(): Promise<Subscription> {
    return apiRequest('GET', '/api/member/subscription');
  },

  async manualRefundSessions(
    subscriptionId: number,
    sessionsToRefund: number,
    groupId?: number,
    poolId?: number
  ): Promise<any> {
    return apiRequest('POST', '/api/member/subscriptions', {
      subscriptionId,
      sessionsToRefund,
      groupId,
      poolId,
    });
  },

  async consumeSession(
    subscriptionId: number,
    opts: { groupId?: number; poolId?: number }
  ): Promise<any> {
    return apiRequest(
      'POST',
      `/api/admin/subscriptions/${subscriptionId}/consume-session`,
      {
        group_id: opts.groupId,
        pool_id: opts.poolId,
      }
    );
  }
};

// Subscription utility functions
export function getCurrentSubscriptionStatus(subscriptions: Subscription[]): string {
  if (!subscriptions?.length) return 'inactive';
  
  const active = subscriptions.find(sub => 
    sub.status === 'active' && isSubscriptionActiveByEndDate(sub.end_date)
  );
  
  return active ? 'active' : 'inactive';
}

export function getActiveSubscriptions(subscriptions: Subscription[]): Subscription[] {
  if (!subscriptions?.length) return [];
  
  return subscriptions.filter(sub => 
    sub.status === 'active' && isSubscriptionActiveByEndDate(sub.end_date)
  );
}
