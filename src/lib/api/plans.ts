import { apiRequest } from '@/lib/queryClient';

export interface Plan {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_popular?: boolean;
  is_premium?: boolean;
  features?: string[];
  plan_groups?: {
    id: number;
    group_id: number;
    session_count: number;
    is_free: boolean;
    groups?: {
      id: number;
      name: string;
      description?: string;
      color?: string;
      categories?: {
        id: number;
        name: string;
        description?: string;
        color?: string;
      }[];
    };
  }[];
}

export interface CreatePlanData {
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  is_active?: boolean;
  planGroups?: {
    groupId: number;
    sessionCount: number;
    isFree: boolean;
  }[];
}

export interface UpdatePlanData {
  name?: string;
  description?: string;
  price?: number;
  duration_days?: number;
  is_active?: boolean;
  planGroups?: {
    groupId: number;
    sessionCount: number;
    isFree: boolean;
  }[];
}

export const planApi = {
  async getPlans(): Promise<Plan[]> {
    return apiRequest('GET', '/api/plans');
  },

  async getPlan(planId: number): Promise<Plan> {
    return apiRequest('GET', `/api/plans/${planId}`);
  },

  async createPlan(data: CreatePlanData): Promise<Plan> {
    return apiRequest('POST', '/api/plans', data);
  },

  async updatePlan(planId: number, data: UpdatePlanData): Promise<Plan> {
    return apiRequest('PUT', `/api/plans/${planId}`, data);
  },

  async deletePlan(planId: number): Promise<void> {
    return apiRequest('DELETE', `/api/plans/${planId}`);
  },

  async checkPlanDeletion(planId: number): Promise<{ canDelete: boolean; linkedSubscriptions?: any[] }> {
    return apiRequest('GET', `/api/plans/${planId}/check-deletion`);
  }
};
