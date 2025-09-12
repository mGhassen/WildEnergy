import { apiRequest } from '@/lib/queryClient';

export interface AdminTermsData {
  id: string;
  version: string;
  title: string;
  content: string;
  term_type: 'terms' | 'interior_regulation';
  is_active: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTermsData {
  version: string;
  title: string;
  content: string;
  is_active?: boolean;
  term_type?: 'terms' | 'interior_regulation';
}

export interface UpdateTermsData {
  version: string;
  title: string;
  content: string;
  is_active?: boolean;
  term_type?: 'terms' | 'interior_regulation';
}

export const adminTermsApi = {
  async getTerms(): Promise<AdminTermsData[]> {
    return apiRequest('GET', '/api/admin/terms');
  },

  async getTermsById(id: string): Promise<AdminTermsData> {
    return apiRequest('GET', `/api/admin/terms/${id}`);
  },

  async createTerms(data: CreateTermsData): Promise<AdminTermsData> {
    return apiRequest('POST', '/api/admin/terms', data);
  },

  async updateTerms(id: string, data: UpdateTermsData): Promise<AdminTermsData> {
    return apiRequest('PUT', `/api/admin/terms/${id}`, data);
  },

  async deleteTerms(id: string): Promise<void> {
    return apiRequest('DELETE', `/api/admin/terms/${id}`);
  },

  async activateTerms(id: string): Promise<{ message: string; terms: AdminTermsData }> {
    return apiRequest('POST', `/api/admin/terms/${id}/activate`);
  },
};
