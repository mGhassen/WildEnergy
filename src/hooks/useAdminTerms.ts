import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTermsApi, AdminTermsData, CreateTermsData, UpdateTermsData } from '@/lib/api/admin-terms';

export function useAdminTerms() {
  return useQuery<AdminTermsData[], Error>({
    queryKey: ['/api/admin/terms'],
    queryFn: () => adminTermsApi.getTerms(),
  });
}

export function useAdminTermsById(id: string) {
  return useQuery<AdminTermsData, Error>({
    queryKey: ['/api/admin/terms', id],
    queryFn: () => adminTermsApi.getTermsById(id),
    enabled: !!id,
  });
}

export function useCreateTerms() {
  const queryClient = useQueryClient();
  
  return useMutation<AdminTermsData, Error, CreateTermsData>({
    mutationFn: (data) => adminTermsApi.createTerms(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/terms'] });
    },
  });
}

export function useUpdateTerms() {
  const queryClient = useQueryClient();
  
  return useMutation<AdminTermsData, Error, { id: string; data: UpdateTermsData }>({
    mutationFn: ({ id, data }) => adminTermsApi.updateTerms(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/terms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/terms', id] });
    },
  });
}

export function useDeleteTerms() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: (id) => adminTermsApi.deleteTerms(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/terms'] });
    },
  });
}

export function useActivateTerms() {
  const queryClient = useQueryClient();
  
  return useMutation<{ message: string; terms: AdminTermsData }, Error, string>({
    mutationFn: (id) => adminTermsApi.activateTerms(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/terms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/terms'] }); // Also invalidate public terms
    },
  });
}
