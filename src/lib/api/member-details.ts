import { apiRequest } from '@/lib/queryClient';

export interface MemberDetails {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  subscriptions: any[];
  registrations: any[];
  checkins: any[];
  payments: any[];
  credit: number;
}

export const memberDetailsApi = {
  async getMemberDetails(memberId: string): Promise<MemberDetails> {
    return apiRequest('GET', `/api/members/${memberId}/details`);
  }
};
