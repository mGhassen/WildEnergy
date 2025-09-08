import { apiRequest } from '../queryClient';

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_member: boolean;
  credit: number;
  groupSessions?: any[];
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

export const memberApi = {
  async getMembers(): Promise<Member[]> {
    return apiRequest('GET', '/api/admin/members');
  },

  async checkMemberSessions(data: CheckMemberSessionsRequest): Promise<CheckMemberSessionsResponse> {
    return apiRequest('POST', '/api/admin/registrations/check-member-sessions', data);
  }
};
