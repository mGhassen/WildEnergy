import { apiRequest } from '@/lib/queryClient';

export interface Trainer {
  id: string;
  account_id: string | null;
  profile_id?: string | null;
  member_id?: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  profile_email?: string | null;
  phone?: string;
  bio?: string;
  status: string;
  specialization?: string;
  experience_years?: number;
  certification?: string;
  hourly_rate?: number;
  user_type?: string;
  accessible_portals?: string[];
  isUnlinked?: boolean;
}

export interface CreateTrainerData {
  profileId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileEmail?: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  certification?: string;
  hourlyRate?: number;
  status?: string;
}

export interface UpdateTrainerData {
  trainerId: string;
  accountId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileEmail?: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  certification?: string;
  hourlyRate?: number;
  status?: string;
}

export interface ProfileSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  profile_email: string | null;
  member_id: string | null;
  trainer_id: string | null;
  account_id: string | null;
  account_email: string | null;
  has_member: boolean;
  has_trainer: boolean;
  has_account: boolean;
}

export const trainerApi = {
  async getTrainers(): Promise<Trainer[]> {
    return apiRequest('GET', '/api/admin/trainers');
  },

  async getTrainer(trainerId: string): Promise<Trainer> {
    return apiRequest('GET', `/api/admin/trainers/${trainerId}`);
  },

  async createTrainer(data: CreateTrainerData): Promise<Trainer> {
    return apiRequest('POST', '/api/admin/trainers', data);
  },

  async updateTrainer(data: UpdateTrainerData): Promise<Trainer> {
    const result = await apiRequest('PUT', '/api/admin/trainers', data);
    return result?.trainer ?? result;
  },

  async deleteTrainer(trainerId: string): Promise<void> {
    return apiRequest('DELETE', '/api/admin/trainers', { trainerId });
  },

  async searchProfiles(
    q: string,
    opts?: { excludeRole?: 'trainer' | 'member'; limit?: number },
  ): Promise<ProfileSearchResult[]> {
    const params = new URLSearchParams({ q });
    if (opts?.excludeRole) params.set('excludeRole', opts.excludeRole);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const result = await apiRequest('GET', `/api/admin/profiles/search?${params}`);
    return result?.profiles ?? [];
  },

  async createAccount(
    trainerId: string,
    data: { email: string; password: string; isAdmin?: boolean },
  ) {
    return apiRequest('POST', `/api/admin/trainers/${trainerId}/create-account`, data);
  },

  async createFromMember(
    memberId: string,
    data?: {
      specialization?: string;
      experienceYears?: number;
      bio?: string;
      certification?: string;
      hourlyRate?: number;
      status?: string;
    },
  ) {
    return apiRequest('POST', `/api/admin/members/${memberId}/create-trainer`, data || {});
  },

  async linkAccount(trainerId: string, accountId: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/link-trainer`, { trainerId });
  },

  async unlinkAccount(trainerId: string): Promise<{ success: boolean; message: string }> {
    const trainer = await this.getTrainer(trainerId);
    if (!trainer.account_id) {
      throw new Error('Trainer is not linked to any account');
    }
    return apiRequest('POST', `/api/admin/accounts/${trainer.account_id}/unlink-trainer`);
  },
};
