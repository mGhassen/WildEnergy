import { useQuery } from '@tanstack/react-query';
import { categoryApi, Category } from '@/lib/api/categories';

// Member Categories Hook
export const useMemberCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: categoryApi.getCategories,
  });
};