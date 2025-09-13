import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi, Member, CheckMemberSessionsRequest, CheckMemberSessionsResponse } from '@/lib/api/members';
import { useToast } from '@/hooks/use-toast';

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => memberApi.getMembers(),
  });
}

export function useCheckMemberSessions() {
  return useMutation({
    mutationFn: (data: CheckMemberSessionsRequest): Promise<CheckMemberSessionsResponse> => 
      memberApi.checkMemberSessions(data),
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to delete member');
      }

      return response.json();
    },
    onSuccess: (data, memberId) => {
      // Invalidate and refetch member-related queries
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member-details'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      
      toast({
        title: 'Member deleted',
        description: `Member has been successfully deleted.`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('Cannot delete member with existing')) {
        const details = error.details || {};
        toast({
          title: 'Cannot delete member',
          description: error.message || 'This member has dependencies that prevent deletion.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to delete member',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
    },
  });
}
