import { apiRequest } from '@/lib/queryClient';

export interface InteriorRegulationData {
  id: string;
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export const interiorRegulationApi = {
  async getInteriorRegulation(): Promise<InteriorRegulationData> {
    return apiRequest('GET', '/api/member/interior-regulation');
  },
};
