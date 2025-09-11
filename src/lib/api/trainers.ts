import { apiRequest } from '@/lib/queryClient';

export interface Trainer {
  id: string; // trainer_id
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  status: string;
  specialization?: string;
  experience_years?: number;
  certification?: string;
  hourly_rate?: number;
  user_type: string;
  accessible_portals: string[];
}

export interface CreateTrainerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  certification?: string;
  hourlyRate?: number;
}

export interface UpdateTrainerData {
  trainerId: string;
  accountId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  experienceYears?: number;
  bio?: string;
  certification?: string;
  hourlyRate?: number;
  status?: string;
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
    return apiRequest('PUT', '/api/admin/trainers', data);
  },

  async deleteTrainer(accountId: string): Promise<void> {
    return apiRequest('DELETE', '/api/admin/trainers', { accountId });
  },

  async linkAccount(trainerId: string, accountId: string): Promise<{ success: boolean; message: string; trainer: any }> {
    return apiRequest('POST', `/api/admin/accounts/${accountId}/link-trainer`, { trainerId });
  },

  async unlinkAccount(trainerId: string): Promise<{ success: boolean; message: string; trainer: any }> {
    // First get the account ID from the trainer
    const trainer = await this.getTrainer(trainerId);
    if (!trainer.account_id) {
      throw new Error('Trainer is not linked to any account');
    }
    return apiRequest('POST', `/api/admin/accounts/${trainer.account_id}/unlink-trainer`);
  }
};
