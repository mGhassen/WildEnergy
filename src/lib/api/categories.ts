import { apiRequest } from '@/lib/queryClient';

export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  groups?: {
    id: number;
    name: string;
    color: string;
  }[];
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  groupIds?: number[];
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  groupIds?: number[];
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
      group_ids: data.groupIds || [],
    };
    return apiRequest('POST', '/api/admin/categories', apiData);
  },

  async updateCategory(categoryId: number, data: UpdateCategoryData): Promise<Category> {
    const apiData: any = {};
    if (data.name !== undefined) apiData.name = data.name;
    if (data.description !== undefined) apiData.description = data.description;
    if (data.color !== undefined) apiData.color = data.color;
    if (data.isActive !== undefined) apiData.isActive = data.isActive;
    if (data.groupIds !== undefined) apiData.group_ids = data.groupIds;
    
    console.log('API update data:', apiData);
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
