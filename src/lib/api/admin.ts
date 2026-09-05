import { apiRequest } from '@/lib/queryClient';
import { CreateAdminClassData, UpdateAdminClassData } from './classes';

export interface AdminClass {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  color?: string;
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
    return apiRequest('GET', '/api/admin/accounts');
  },

  async getTrainers(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/trainers');
  },

  async getRegistrations(params?: { scheduleId?: number }): Promise<any[]> {
    const qs =
      params?.scheduleId != null ? `?scheduleId=${params.scheduleId}` : '';
    return apiRequest('GET', `/api/admin/registrations${qs}`);
  },

  async getSubscriptions(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/subscriptions');
  },

  async getPayments(): Promise<any[]> {
    return apiRequest('GET', '/api/admin/payments');
  },

  async getCheckins(params?: { scheduleId?: number; date?: string }): Promise<any[]> {
    const search = new URLSearchParams();
    if (params?.scheduleId != null) search.set('scheduleId', String(params.scheduleId));
    if (params?.date) search.set('date', params.date);
    const qs = search.toString() ? `?${search.toString()}` : '';
    return apiRequest('GET', `/api/admin/checkins${qs}`);
  },

  async getDashboardStats(): Promise<any> {
    return apiRequest('GET', '/api/admin/dashboard');
  },

  async getDashboardTasks(): Promise<any> {
    return apiRequest('GET', '/api/admin/dashboard/tasks');
  },

  // Admin class management methods
  async createAdminClass(data: CreateAdminClassData): Promise<AdminClass> {
    return apiRequest('POST', '/api/admin/classes', data);
  },

  async updateAdminClass(classId: number, data: UpdateAdminClassData): Promise<AdminClass> {
    return apiRequest('PATCH', `/api/admin/classes/${classId}`, data);
  },

  async deleteAdminClass(classId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/classes/${classId}`);
  }
};
