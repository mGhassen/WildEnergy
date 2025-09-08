import { apiRequest } from '@/lib/queryClient';

export interface AdminClass {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  schedule_id: number;
  start_date: string;
  end_date: string;
  max_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
    color?: string;
  };
  schedule?: {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    day_of_week: number;
  };
}

export const adminApi = {
  async getClasses(): Promise<AdminClass[]> {
    return apiRequest('GET', '/api/admin/classes');
  },

  async getCategories(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/categories');
  },

  async getUsers(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/users');
  },

  async getTrainers(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/trainers');
  },

  async getRegistrations(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/registrations');
  },

  async getSubscriptions(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/subscriptions');
  },

  async getPayments(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/payments');
  },

  async getCheckins(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/checkins');
  },

  async getDashboardStats(): Promise<any> {
    return apiRequest('GET', '/api/admin/dashboard');
  }
};
