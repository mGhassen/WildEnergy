import { apiRequest } from '@/lib/queryClient';

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  group_id?: number;
  created_at: string;
  updated_at: string;
  groups?: {
    id: number;
    name: string;
    color: string;
  };
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  groupId?: number | null;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  groupId?: number | null;
}

export const categoryApi = {
  async getCategories(): Promise<Category[]> {
    return apiRequest('GET', '/api/categories');
  },

  async getCategory(categoryId: number): Promise<Category> {
    return apiRequest('GET', `/api/categories/${categoryId}`);
  },

  async createCategory(data: CreateCategoryData): Promise<Category> {
    const apiData = {
      name: data.name,
      description: data.description,
      color: data.color,
      is_active: data.isActive ?? true,
      group_id: data.groupId,
    };
    return apiRequest('POST', '/api/categories', apiData);
  },

  async updateCategory(categoryId: number, data: UpdateCategoryData): Promise<Category> {
    const apiData = {
      name: data.name,
      description: data.description,
      color: data.color,
      is_active: data.isActive,
      group_id: data.groupId,
    };
    return apiRequest('PUT', `/api/categories/${categoryId}`, apiData);
  },

  async deleteCategory(categoryId: number): Promise<void> {
    return apiRequest('DELETE', `/api/categories/${categoryId}`);
  }
};
