import { apiRequest } from '@/lib/queryClient';

export interface Checkin {
  id: number;
  user_id: string;
  class_id?: number;
  course_id?: number;
  checkin_time: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  class?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  course?: {
    id: number;
    name: string;
  };
}

export interface CreateCheckinData {
  user_id: string;
  class_id?: number;
  course_id?: number;
  status?: string;
  notes?: string;
}

export interface UpdateCheckinData {
  status?: string;
  notes?: string;
}

export const checkinApi = {
  async getCheckins(): Promise<Checkin[]> {
    return apiRequest('GET', '/api/admin/checkins');
  },

  async getCheckin(checkinId: number): Promise<Checkin> {
    return apiRequest('GET', `/api/admin/checkins/${checkinId}`);
  },

  async createCheckin(data: CreateCheckinData): Promise<Checkin> {
    return apiRequest('POST', '/api/admin/checkins', data);
  },

  async updateCheckin(checkinId: number, data: UpdateCheckinData): Promise<Checkin> {
    return apiRequest('PUT', `/api/admin/checkins/${checkinId}`, data);
  },

  async deleteCheckin(checkinId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/checkins/${checkinId}`);
  },

  async checkinUser(userId: string, data: { class_id?: number; course_id?: number }): Promise<Checkin> {
    return apiRequest('POST', `/api/checkin`, { user_id: userId, ...data });
  },

  async getCheckinInfo(qrCode: string): Promise<any> {
    return apiRequest('GET', `/checkin/qr/${qrCode}`);
  },

  async validateCheckin(qrCode: string): Promise<any> {
    return apiRequest('POST', '/checkins', { qr_code: qrCode });
  },

  async unvalidateCheckin(registrationId: string): Promise<any> {
    return apiRequest('POST', `/checkins/${registrationId}/unvalidate`);
  }
};
