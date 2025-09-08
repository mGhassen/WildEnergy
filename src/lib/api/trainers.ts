import { apiRequest } from '@/lib/queryClient';

export interface Trainer {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  status: string;
  specialization?: string;
  experience_years?: number;
  certification?: string;
}

export interface CreateTrainerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  status?: string;
  specialization?: string;
  experience_years?: number;
  certification?: string;
}

export interface UpdateTrainerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  status?: string;
  specialization?: string;
  experience_years?: number;
  certification?: string;
  user_id?: string;
}

export const trainerApi = {
  async getTrainers(): Promise<Trainer[]> {
    return apiRequest('GET', '/api/trainers');
  },

  async getTrainer(trainerId: number): Promise<Trainer> {
    return apiRequest('GET', `/api/trainers/${trainerId}`);
  },

  async createTrainer(data: CreateTrainerData): Promise<Trainer> {
    return apiRequest('POST', '/api/trainers', data);
  },

  async updateTrainer(trainerId: number, data: UpdateTrainerData): Promise<Trainer> {
    return apiRequest('PUT', `/api/trainers/${trainerId}`, data);
  },

  async deleteTrainer(trainerId: number): Promise<void> {
    return apiRequest('DELETE', `/api/trainers/${trainerId}`);
  }
};
