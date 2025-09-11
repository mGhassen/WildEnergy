import { apiRequest } from '../queryClient';

export interface Member {
  id: string; // member_id
  account_id: string;
  first_name: string;
  last_name: string;
  email: string; // Account email for authentication
  profile_email?: string; // Contact email, separate from account email
  phone?: string;
  is_member: boolean;
  credit: number;
  member_notes?: string;
  member_status?: string;
  // subscription_status removed - should be determined dynamically from subscriptions table
  user_type: string;
  accessible_portals: string[];
  groupSessions?: any[];
  subscriptions?: any[]; // Add subscriptions array for dynamic status calculation
  [key: string]: any; // Add index signature for flexibility
}

export interface CheckMemberSessionsRequest {
  memberId: string;
  courseId: number;
}

export interface CheckMemberSessionsResponse {
  can_register: boolean;
  error?: string;
}

export interface MemberDetails {
  member: {
    id: string;
    account_id?: string;
    firstName: string;
    lastName: string;
    email: string; // Account email for authentication
    profileEmail?: string; // Contact email, separate from account email
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

export const memberApi = {
  async getMembers(): Promise<Member[]> {
    return apiRequest('GET', '/api/admin/members');
  },

  async getMemberDetails(memberId: string): Promise<MemberDetails> {
    return apiRequest('GET', `/api/admin/members/${memberId}`);
  },

  async checkMemberSessions(data: CheckMemberSessionsRequest): Promise<CheckMemberSessionsResponse> {
    return apiRequest('POST', '/api/admin/registrations/check-member-sessions', data);
  }
};
