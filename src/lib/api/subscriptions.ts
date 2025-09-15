import { apiRequest } from '@/lib/queryClient';

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

  async manualRefundSessions(subscriptionId: number, sessionsToRefund: number): Promise<any> {
    return apiRequest('POST', '/api/member/subscriptions', { subscriptionId, sessionsToRefund });
  },

  async consumeSession(subscriptionId: number, groupId: number): Promise<any> {
    return apiRequest('POST', `/api/admin/subscriptions/${subscriptionId}/consume-session`, { group_id: groupId });
  }
};

// Subscription utility functions
export function getCurrentSubscriptionStatus(subscriptions: Subscription[]): string {
  if (!subscriptions?.length) return 'inactive';
  
  const active = subscriptions.find(sub => 
    sub.status === 'active' && new Date(sub.end_date) > new Date()
  );
  
  return active ? 'active' : 'inactive';
}

export function getActiveSubscriptions(subscriptions: Subscription[]): Subscription[] {
  if (!subscriptions?.length) return [];
  
  return subscriptions.filter(sub => 
    sub.status === 'active' && new Date(sub.end_date) > new Date()
  );
}
