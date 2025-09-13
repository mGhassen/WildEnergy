import { apiRequest } from '@/lib/queryClient';

export interface Account {
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
  // subscription_status removed - should be determined dynamically from subscriptions table
  trainer_id?: string;
  specialization?: string;
  experience_years?: number;
  bio?: string;
  certification?: string;
  hourly_rate?: number;
  trainer_status?: string;
  user_type: string;
  accessible_portals: string[];
  confirmed_at?: string;
  created_at?: string;
}

export interface CreateAccountData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isAdmin?: boolean;
  status?: string;
  creationMethod?: "password" | "invite";
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

export interface UpdateAccountData {
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

export const accountApi = {
  async getAccounts(): Promise<Account[]> {
    return apiRequest('GET', '/api/admin/accounts');
  },

  async searchAccounts(query: string, limit: number = 10, memberId?: string): Promise<{ accounts: Account[]; error?: string }> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });
    if (memberId) {
      params.append('memberId', memberId);
    }
    return apiRequest('GET', `/api/admin/accounts/search?${params.toString()}`);
  },

  async getAccount(accountId: string): Promise<Account> {
    return apiRequest('GET', `/api/admin/accounts/${accountId}`);
  },

  async createAccount(data: CreateAccountData): Promise<Account> {
    return apiRequest('POST', '/api/admin/accounts', data);
  },

  async updateAccount(data: UpdateAccountData): Promise<Account> {
    return apiRequest('PUT', '/api/admin/accounts', data);
  },

  async deleteAccount(accountId: string): Promise<void> {
    return apiRequest('DELETE', '/api/admin/accounts', { accountId });
  },

  async createAdmin(data: CreateAccountData): Promise<Account> {
    return apiRequest('POST', '/api/create-admin', data);
  },

  async createTestAccount(): Promise<Account> {
    return apiRequest('POST', '/api/create-test-user');
  },

  async linkTrainer(accountId: string, trainerId: string): Promise<{ success: boolean; message: string; account: any }> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/link-trainer`, { trainerId });
  },

  async unlinkTrainer(accountId: string): Promise<{ success: boolean; message: string; account: any }> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/unlink-trainer`);
  },

  // Admin-specific operations
  async setPassword(accountId: string, password: string): Promise<any> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/set-password`, { password });
  },

  async approveAccount(accountId: string): Promise<any> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/approve`);
  },

  async disapproveAccount(accountId: string): Promise<any> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/disapprove`);
  },

  async resetPassword(accountId: string): Promise<any> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/reset-password`);
  },

  async resendInvitation(accountId: string): Promise<any> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/resend-invitation`);
  },

  // Account linking functions
  async linkMember(accountId: string, memberId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/link-member`, { memberId });
  },

  async unlinkMember(accountId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/unlink-member`);
  }
};
