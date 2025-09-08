import { apiRequest } from '@/lib/queryClient';

export interface Group {
  id: number;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    id: number;
    name: string;
    description?: string;
    color?: string;
  }[];
}

export interface CreateGroupData {
  name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  categoryIds?: number[];
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  categoryIds?: number[];
}

export const groupApi = {
  async getGroups(): Promise<Group[]> {
    return apiRequest('GET', '/api/groups');
  },

  async getGroup(groupId: number): Promise<Group> {
    return apiRequest('GET', `/api/groups/${groupId}`);
  },

  async createGroup(data: CreateGroupData): Promise<Group> {
    return apiRequest('POST', '/api/groups', data);
  },

  async updateGroup(groupId: number, data: UpdateGroupData): Promise<Group> {
    return apiRequest('PUT', `/api/groups/${groupId}`, data);
  },

  async deleteGroup(groupId: number): Promise<void> {
    return apiRequest('DELETE', `/api/groups/${groupId}`);
  },

  async checkGroupDeletion(groupId: number): Promise<{ canDelete: boolean; linkedPlans?: string[] }> {
    return apiRequest('GET', `/api/groups/${groupId}/check-deletion`);
  }
};
