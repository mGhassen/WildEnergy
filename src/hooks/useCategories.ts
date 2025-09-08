import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi, Category, CreateCategoryData, UpdateCategoryData } from '@/lib/api/categories';
import { useToast } from '@/hooks/use-toast';

export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getCategories(),
  });
}

export function useCategory(categoryId: number) {
  return useQuery<Category, Error>({
    queryKey: ['category', categoryId],
    queryFn: () => categoryApi.getCategory(categoryId),
    enabled: !!categoryId,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCategoryData) => categoryApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Category created',
        description: 'The category has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create category',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: number; data: UpdateCategoryData }) => 
      categoryApi.updateCategory(categoryId, data),
    onSuccess: (_, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Category updated',
        description: 'The category has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update category',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (categoryId: number) => categoryApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Category deleted',
        description: 'The category has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      let errorMessage = error.message || 'Please try again';
      
      // If the category is being used by classes, show specific message
      if (error.classes && error.classes.length > 0) {
        const classNames = error.classes.map((cls: any) => cls.name).join(', ');
        errorMessage = `Cannot delete category. It is being used by the following classes: ${classNames}. Please remove the category from these classes first.`;
      }
      
      toast({
        title: 'Failed to delete category',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}
