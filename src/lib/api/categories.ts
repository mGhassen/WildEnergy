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
    return apiRequest('GET', '/api/admin/categories');
  },

  async getCategory(categoryId: number): Promise<Category> {
    return apiRequest('GET', `/api/admin/categories/${categoryId}`);
  },

  async createCategory(data: CreateCategoryData): Promise<Category> {
    const apiData = {
      name: data.name,
      description: data.description,
      color: data.color,
      is_active: data.isActive ?? true,
      group_id: data.groupId,
    };
    return apiRequest('POST', '/api/admin/categories', apiData);
  },

  async updateCategory(categoryId: number, data: UpdateCategoryData): Promise<Category> {
    const apiData = {
      name: data.name,
      description: data.description,
      color: data.color,
      is_active: data.isActive,
      group_id: data.groupId,
    };
    return apiRequest('PATCH', `/api/admin/categories/${categoryId}`, apiData);
  },

  async deleteCategory(categoryId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/categories/${categoryId}`);
  }
};

// Member category API for member access
export const memberCategoryApi = {
  async getCategories(): Promise<Category[]> {
    return apiRequest('GET', '/api/member/categories');
  }
};
