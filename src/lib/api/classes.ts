import { apiRequest } from '@/lib/queryClient';

export interface Class {
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

export interface CreateClassData {
  name: string;
  description?: string;
  category_id: number | null;
  schedule_id: number;
  start_date: string;
  end_date: string;
  max_capacity: number;
  is_active?: boolean;
}

export interface UpdateClassData {
  name?: string;
  description?: string;
  category_id?: number | null;
  schedule_id?: number;
  start_date?: string;
  end_date?: string;
  max_capacity?: number;
  is_active?: boolean;
}

export interface CreateAdminClassData {
  name: string;
  description?: string;
  category_id: number | null;
  difficulty: string;
  duration: number;
  max_capacity: number;
  equipment?: string;
  is_active?: boolean;
}

export interface UpdateAdminClassData {
  name?: string;
  description?: string;
  category_id?: number | null;
  difficulty?: string;
  duration?: number;
  max_capacity?: number;
  equipment?: string;
  is_active?: boolean;
}

export const classApi = {
  async getClasses(): Promise<Class[]> {
    return apiRequest('GET', '/api/classes');
  },

  async getClass(classId: number): Promise<Class> {
    return apiRequest('GET', `/api/classes/${classId}`);
  },

  async createClass(data: CreateClassData): Promise<Class> {
    return apiRequest('POST', '/api/classes', data);
  },

  async updateClass(classId: number, data: UpdateClassData): Promise<Class> {
    return apiRequest('PUT', `/api/classes/${classId}`, data);
  },

  async deleteClass(classId: number): Promise<void> {
    return apiRequest('DELETE', `/api/classes/${classId}`);
  },

  // Admin class functions
  async createAdminClass(data: CreateAdminClassData): Promise<Class> {
    return apiRequest('POST', '/api/admin/classes', data);
  },

  async updateAdminClass(classId: number, data: UpdateAdminClassData): Promise<Class> {
    return apiRequest('PUT', `/api/admin/classes/${classId}`, data);
  },

  async deleteAdminClass(classId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/classes/${classId}`);
  }
};
