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
    return apiRequest('POST', '/api/registrations/force', { courseId });
  },

  async getMemberRegistrations(): Promise<Registration[]> {
    return apiRequest('GET', '/api/registrations');
  }
};
