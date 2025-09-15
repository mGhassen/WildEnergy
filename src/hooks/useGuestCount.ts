import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Hook to get guest count for a member
export function useGuestCount(memberId: string) {
  return useQuery({
    queryKey: ['guest-count', memberId],
    queryFn: () => apiRequest('GET', `/api/admin/members/${memberId}/increment-guest`),
    enabled: !!memberId,
  });
}

// Hook to increment guest count
export function useIncrementGuestCount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (memberId: string) => 
      apiRequest('POST', `/api/admin/members/${memberId}/increment-guest`),
    onSuccess: (data, memberId) => {
      // Invalidate and refetch guest count for this member
      queryClient.invalidateQueries({ queryKey: ['guest-count', memberId] });
      // Also invalidate members list to update any UI that shows guest counts
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}
