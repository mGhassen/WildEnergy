import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_admin: boolean;
  is_member: boolean;
  is_trainer: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  credit?: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  is_admin?: boolean;
  is_member?: boolean;
  is_trainer?: boolean;
}

export interface UpdateUserData {
  full_name?: string;
  phone?: string;
  is_admin?: boolean;
  is_member?: boolean;
  is_trainer?: boolean;
  status?: string;
  credit?: number;
  first_name?: string;
  last_name?: string;
  age?: number;
  profession?: string;
  address?: string;
  email?: string;
  terms_accepted?: boolean;
  onboarding_completed?: boolean;
}

export const userApi = {
  async getUsers(): Promise<User[]> {
    return apiRequest('GET', '/api/admin/users');
  },

  async getUser(userId: string): Promise<User> {
    return apiRequest('GET', `/api/admin/users/${userId}`);
  },

  async createUser(data: CreateUserData): Promise<User> {
    return apiRequest('POST', '/api/admin/users', data);
  },

  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    return apiRequest('PUT', `/api/admin/users/${userId}`, data);
  },

  async deleteUser(userId: string): Promise<void> {
    return apiRequest('DELETE', `/api/admin/users/${userId}`);
  },

  async createAdmin(data: CreateUserData): Promise<User> {
    return apiRequest('POST', '/api/create-admin', data);
  },

  async createTestUser(): Promise<User> {
    return apiRequest('POST', '/api/create-test-user');
  }
};
