import { apiRequest } from '@/lib/queryClient';

export interface User {
  account_id: string;
  email: string;
  account_status: string;
  last_login?: string;
  is_admin: boolean;
  first_name?: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  profession?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_image_url?: string;
  member_id?: string;
  member_notes?: string;
  credit?: number;
  member_status?: string;
  subscription_status?: string;
  trainer_id?: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  certification?: string;
  hourly_rate?: number;
  trainer_status?: string;
  user_type: string;
  accessible_portals: string[];
}

export interface CreateUserData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  isAdmin?: boolean;
  memberData?: {
    memberNotes?: string;
    credit?: number;
  };
  trainerData?: {
    specialization?: string;
    experienceYears?: number;
    bio?: string;
    certification?: string;
    hourlyRate?: number;
  };
}

export interface UpdateUserData {
  accountId: string;
  profileData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    profession?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  };
  accountData?: {
    email?: string;
    status?: string;
    isAdmin?: boolean;
  };
  memberData?: {
    memberNotes?: string;
    credit?: number;
    status?: string;
  };
  trainerData?: {
    specialization?: string;
    experienceYears?: number;
    bio?: string;
    certification?: string;
    hourlyRate?: number;
    status?: string;
  };
}

export const userApi = {
  async getUsers(): Promise<User[]> {
    return apiRequest('GET', '/api/admin/users');
  },

  async getUser(accountId: string): Promise<User> {
    return apiRequest('GET', `/api/admin/users/${accountId}`);
  },

  async createUser(data: CreateUserData): Promise<User> {
    return apiRequest('POST', '/api/admin/users', data);
  },

  async updateUser(data: UpdateUserData): Promise<User> {
    return apiRequest('PUT', '/api/admin/users', data);
  },

  async deleteUser(accountId: string): Promise<void> {
    return apiRequest('DELETE', '/api/admin/users', { accountId });
  },

  async createAdmin(data: CreateUserData): Promise<User> {
    return apiRequest('POST', '/api/create-admin', data);
  },

  async createTestUser(): Promise<User> {
    return apiRequest('POST', '/api/create-test-user');
  }
};
