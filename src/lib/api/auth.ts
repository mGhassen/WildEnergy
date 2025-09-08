import { apiRequest } from '@/lib/queryClient';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token?: string;
  };
  user?: any;
}

export interface SessionData {
  user: any;
  session: any;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiRequest('POST', '/api/auth/login', credentials);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return apiRequest('POST', '/api/auth/register', data);
  },

  async getSession(): Promise<SessionData> {
    return apiRequest('GET', '/api/auth/session');
  },

  async logout(): Promise<void> {
    return apiRequest('POST', '/api/auth/logout');
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest('POST', '/api/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiRequest('POST', '/api/auth/reset-password', { token, password });
  },

  async acceptInvitation(token: string, password: string): Promise<{ message: string }> {
    return apiRequest('POST', '/api/auth/accept-invitation', { token, password });
  },

  async checkAccountStatus(): Promise<{ status: string; message?: string }> {
    return apiRequest('GET', '/api/auth/account-status');
  },

  async getMemberSession(): Promise<SessionData> {
    return apiRequest('GET', '/api/auth/session');
  }
};
