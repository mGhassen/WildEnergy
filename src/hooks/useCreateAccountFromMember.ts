import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/api';

interface CreateAccountFromMemberData {
  email: string;
  password: string;
  isAdmin?: boolean;
  status?: string;
}

export function useCreateAccountFromMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, data }: { memberId: string; data: CreateAccountFromMemberData }) => {
      const response = await fetch(`/api/admin/members/${memberId}/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create account');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate member details query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['member-details'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
