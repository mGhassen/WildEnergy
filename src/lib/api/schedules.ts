import { apiRequest } from '@/lib/queryClient';

export interface Schedule {
  id: number;
  class_id: number;
  trainer_id: string; // Changed to string for UUID
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_participants: number;
  is_active: boolean;
  repetition_type: string;
  schedule_date?: string;
  start_date?: string;
  end_date?: string;
  code?: string;
  created_at: string;
  updated_at: string;
  class?: {
    id: number;
    name: string;
    category?: {
      id: number;
      name: string;
      color: string;
    };
  };
  trainer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateScheduleData {
  class_id: number;
  trainer_id: string; // Changed to string for UUID
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_participants: number;
  is_active?: boolean;
  repetition_type: string;
  schedule_date?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdateScheduleData {
  class_id?: number;
  trainer_id?: string; // Changed to string for UUID
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  max_participants?: number;
  is_active?: boolean;
  repetition_type?: string;
  schedule_date?: string;
  start_date?: string;
  end_date?: string;
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
