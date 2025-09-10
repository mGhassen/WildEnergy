import { useMutation } from '@tanstack/react-query';
import { setupApi, CreateAdminData, CreateAdminResponse } from '@/lib/api/setup';
import { useToast } from '@/hooks/use-toast';

export function useCreateAdmin() {
  const { toast } = useToast();

  return useMutation<CreateAdminResponse, Error, CreateAdminData>({
    mutationFn: (data: CreateAdminData) => setupApi.createAdmin(data),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Success",
          description: "Admin user created successfully! You can now log in.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to create admin user',
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || 'Failed to create admin user',
        variant: "destructive",
      });
    },
  });
}
