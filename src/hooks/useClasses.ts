import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classApi, Class, CreateClassData, UpdateClassData } from '@/lib/api/classes';
import { adminApi } from '@/lib/api/admin';
import { CreateAdminClassData, UpdateAdminClassData } from '@/lib/api/classes';
import { useToast } from '@/hooks/use-toast';

export function useClasses() {
  return useQuery<Class[], Error>({
    queryKey: ['classes'],
    queryFn: () => classApi.getClasses(),
  });
}

export function useClass(classId: number) {
  return useQuery<Class, Error>({
    queryKey: ['class', classId],
    queryFn: () => classApi.getClass(classId),
    enabled: !!classId,
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateClassData) => classApi.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: 'Class created',
        description: 'The class has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create class',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: UpdateClassData }) => 
      classApi.updateClass(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: 'Class updated',
        description: 'The class has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update class',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (classId: number) => classApi.deleteClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: 'Class deleted',
        description: 'The class has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete class',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

// Admin class hooks
export function useCreateAdminClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAdminClassData) => adminApi.createAdminClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] });
      toast({
        title: 'Class created',
        description: 'The class has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create class',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAdminClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ classId, data }: { classId: number; data: UpdateAdminClassData }) => 
      adminApi.updateAdminClass(classId, data),
    onSuccess: (_, { classId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] });
      toast({
        title: 'Class updated',
        description: 'The class has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update class',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAdminClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (classId: number) => adminApi.deleteAdminClass(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] });
      toast({
        title: 'Class deleted',
        description: 'The class has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete class',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
