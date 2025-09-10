import { apiRequest } from '@/lib/queryClient';

export interface Registration {
  id: number;
  user_id: string;
  class_id: number;
  course_id?: number;
  subscription_id?: number;
  status: string;
  registered_at: string;
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

export interface CreateRegistrationData {
  user_id: string;
  class_id: number;
  course_id?: number;
  subscription_id?: number;
  status?: string;
}

export interface UpdateRegistrationData {
  status?: string;
}

export interface BulkRegistrationData {
  courseId: number;
  memberIds: string[];
}

export interface BulkRegistrationResponse {
  success: boolean;
  summary: {
    registered: number;
    errors: number;
    alreadyRegistered: number;
  };
  registrations?: any[];
  errors?: any[];
}

export const registrationApi = {
  async getRegistrations(): Promise<Registration[]> {
    return apiRequest('GET', '/api/admin/registrations');
  },

  async getRegistration(registrationId: number): Promise<Registration> {
    return apiRequest('GET', `/api/admin/registrations/${registrationId}`);
  },

  async createRegistration(data: CreateRegistrationData): Promise<Registration> {
    return apiRequest('POST', '/api/admin/registrations', data);
  },

  async updateRegistration(registrationId: number, data: UpdateRegistrationData): Promise<Registration> {
    return apiRequest('PUT', `/api/admin/registrations/${registrationId}`, data);
  },

  async deleteRegistration(registrationId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/registrations/${registrationId}`);
  },

  async registerForClass(classId: number, data: { subscription_id?: number }): Promise<Registration> {
    return apiRequest('POST', `/api/registrations/register/${classId}`, data);
  },

  async cancelRegistration(registrationId: number): Promise<void> {
    return apiRequest('POST', `/api/registrations/${registrationId}/cancel`);
  },

  async forceRegistration(courseId: number): Promise<Registration> {
    return apiRequest('POST', '/api/member/registrations', { courseId });
  },

  async getMemberRegistrations(): Promise<Registration[]> {
    return apiRequest('GET', '/api/registrations');
  },

  // Admin-specific operations
  async bulkRegisterMembers(data: BulkRegistrationData): Promise<BulkRegistrationResponse> {
    return apiRequest('POST', '/api/admin/registrations/bulk', data);
  },

  async validateCheckin(registrationId: number): Promise<any> {
    return apiRequest('POST', `/api/checkins/validate/${registrationId}`);
  },

  async unvalidateCheckin(registrationId: number): Promise<any> {
    return apiRequest('POST', `/api/checkins/unvalidate/${registrationId}`);
  },

  async adminCancelRegistration(registrationId: number, refundSession?: boolean): Promise<any> {
    return apiRequest('POST', `/api/registrations/${registrationId}/cancel`, refundSession !== undefined ? { refundSession } : {});
  }
};
