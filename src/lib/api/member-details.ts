import { apiRequest } from '@/lib/queryClient';

export interface MemberDetails {
  member: {
    id: string;
    account_id?: string;
    firstName: string;
    lastName: string;
    email: string;
    status?: string;
    accountStatus?: string;
    subscriptionStatus?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    profession?: string;
    memberNotes?: string;
    credit: number;
    userType?: string;
    accessiblePortals?: string[];
    createdAt?: string;
  };
  subscriptions: any[];
  registrations: any[];
  checkins: any[];
  payments: any[];
}

export const memberDetailsApi = {
  async getMemberDetails(memberId: string): Promise<MemberDetails> {
    return apiRequest('GET', `/api/admin/members/${memberId}`);
  }
};
