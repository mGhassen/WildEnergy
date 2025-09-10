import { apiRequest } from '../queryClient';

export interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  userType: string;
  createdAt: string;
}

export interface LinkAccountRequest {
  accountId: string;
}

export interface LinkAccountResponse {
  success: boolean;
  message: string;
  data: {
    memberId: string;
    accountId: string;
    memberEmail: string;
    accountEmail: string;
  };
}

export interface UnlinkAccountResponse {
  success: boolean;
  message: string;
  data: {
    memberId: string;
    unlinkedAccountId: string;
    memberEmail: string;
  };
}

export interface AccountSearchResponse {
  accounts: Account[];
  total: number;
  query: string;
}

export const accountLinkingApi = {
  async linkAccount(memberId: string, data: LinkAccountRequest): Promise<LinkAccountResponse> {
    return apiRequest('POST', `/api/admin/members/${memberId}/link-account`, data);
  },

  async unlinkAccount(memberId: string): Promise<UnlinkAccountResponse> {
    return apiRequest('POST', `/api/admin/members/${memberId}/unlink-account`);
  },

  async searchAccounts(query: string, limit: number = 10): Promise<AccountSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });
    return apiRequest('GET', `/api/admin/accounts/search?${params}`);
  }
};
