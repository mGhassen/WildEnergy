import { apiRequest } from '@/lib/queryClient';

export interface TermsData {
  id: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export const termsApi = {
  async getTerms(): Promise<TermsData> {
    return apiRequest('GET', '/api/terms');
  }
};
