import { apiRequest } from '@/lib/queryClient';

export interface Checkin {
  id: number;
  member_id: string;
  registration_id: number;
  session_consumed: boolean;
  notes?: string;
  checkin_time: string;
  created_at: string;
  updated_at: string;
}

export interface CheckinInfo {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    status?: string;
    activeSubscription?: {
      planName: string;
      status: string;
      sessionsRemaining: number;
    };
  };
  course: {
    id: string;
    course_date: string;
    start_time: string;
    end_time: string;
    class_id: number;
    trainer_id: string;
    class: {
      id: number;
      name: string;
      category?: string;
      difficulty?: string;
      maxCapacity?: number;
    };
    trainer: {
      id: number;
      users: {
        id: string;
        first_name: string;
        last_name: string;
      };
    };
  };
  registration: {
    id: string;
    status: string;
    registeredAt: string;
  };
  registeredCount: number;
  checkedInCount: number;
  totalMembers: number;
  alreadyCheckedIn: boolean;
  registeredMembers?: { id: string; first_name: string; last_name: string; email: string; status?: string }[];
  attendantMembers?: { id: string; first_name: string; last_name: string; email: string }[];
  members?: { id: string; first_name: string; last_name: string; email: string; status?: 'registered' | 'attended' | 'absent' | 'checked_in' }[];
}

export interface CheckinResponse {
  success: boolean;
  message?: string;
  data?: CheckinInfo;
}

export interface CheckinRequest {
  qr_code: string;
}

export interface CreateCheckinData {
  member_id: string;
  registration_id: number;
  session_consumed?: boolean;
  notes?: string;
}

export interface UpdateCheckinData {
  session_consumed?: boolean;
  notes?: string;
}

export const checkinApi = {
  // Existing functions
  async getCheckins(): Promise<Checkin[]> {
    return apiRequest('GET', '/api/admin/checkins');
  },

  async getMemberCheckins(): Promise<Checkin[]> {
    return apiRequest('GET', '/api/member/checkins');
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

  // QR code functions
  async getCheckinInfo(qrCode: string): Promise<CheckinResponse> {
    return apiRequest('GET', `/checkin/qr/${qrCode}`);
  },

  async checkInRegistration(registrationId: string): Promise<CheckinResponse> {
    return apiRequest('POST', `/api/admin/registrations/${registrationId}/check-in`);
  },

  async checkOutRegistration(registrationId: string): Promise<CheckinResponse> {
    return apiRequest('POST', `/api/admin/registrations/${registrationId}/check-out`);
  }
};