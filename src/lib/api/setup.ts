import { apiRequest } from '@/lib/queryClient';

export interface CreateAdminData {
  email: string;
  password: string;
}

export interface CreateAdminResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const setupApi = {
  async createAdmin(data: CreateAdminData): Promise<CreateAdminResponse> {
    return apiRequest('POST', '/api/create-admin', data);
  }
};
