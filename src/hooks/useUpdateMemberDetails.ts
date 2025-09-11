import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface UpdateMemberDetailsData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  profession?: string;
  memberNotes?: string;
  status?: string;
  credit?: number;
}

export function useUpdateMemberDetails() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateMemberDetailsData }) => 
      apiRequest('PUT', `/api/admin/members/${memberId}`, data),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['member-details', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: 'Member updated',
        description: 'Member details have been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update member',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
