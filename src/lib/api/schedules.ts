import { apiRequest } from '@/lib/queryClient';

export interface Schedule {
  id: number;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  trainer_id: number;
  max_capacity: number;
  is_active: boolean;
  code?: string;
  created_at: string;
  updated_at: string;
  trainer?: {
    id: number;
    user: {
      full_name: string;
    };
  };
}

export interface CreateScheduleData {
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  trainer_id: number;
  max_capacity: number;
  is_active?: boolean;
}

export interface UpdateScheduleData {
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  day_of_week?: number;
  trainer_id?: number;
  max_capacity?: number;
  is_active?: boolean;
}

export const scheduleApi = {
  async getSchedules(): Promise<Schedule[]> {
    return apiRequest('GET', '/api/admin/schedules');
  },

  async getSchedule(scheduleId: number): Promise<Schedule> {
    return apiRequest('GET', `/api/admin/schedules/${scheduleId}`);
  },

  async createSchedule(data: CreateScheduleData): Promise<Schedule> {
    return apiRequest('POST', '/api/admin/schedules', data);
  },

  async updateSchedule(scheduleId: number, data: UpdateScheduleData): Promise<Schedule> {
    return apiRequest('PUT', `/api/admin/schedules/${scheduleId}`, data);
  },

  async deleteSchedule(scheduleId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/schedules/${scheduleId}`);
  }
};
