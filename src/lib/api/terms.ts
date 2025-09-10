import { apiRequest } from '@/lib/queryClient';

export interface TermsData {
  content: string;
}

export const termsApi = {
  async getTerms(): Promise<TermsData> {
    return apiRequest('GET', '/api/terms');
  }
};
