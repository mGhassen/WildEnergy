import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface CreditEntry {
  id: number;
  amount: number;
  entryType: 'manual_add' | 'manual_remove' | 'payment_use' | 'payment_excess' | 'payment_reversal' | 'initial' | 'opening_balance';
  entryDate: string;
  notes?: string | null;
  balanceAfter: number;
  paymentId?: number | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface MemberCreditData {
  credit: number;
  debit: number;
  entries: CreditEntry[];
}

export interface AdjustCreditPayload {
  amount: number;
  action: 'add' | 'remove';
  entryDate: string;
  notes?: string;
}

export function useMemberCredit(memberId: string | null, enabled = true) {
  return useQuery<MemberCreditData, Error>({
    queryKey: ['member-credit', memberId],
    queryFn: () => apiRequest('GET', `/api/admin/members/${memberId}/credit`),
    enabled: !!memberId && enabled,
  });
}

export function useAdjustMemberCredit(memberId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: AdjustCreditPayload) =>
      apiRequest('POST', `/api/admin/members/${memberId}/credit`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-credit', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member-details', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: 'Credit updated',
        description: 'Member credit has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update credit',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export interface UpdateCreditEntryPayload {
  entryId: number;
  entryDate?: string;
  amount?: number;
  notes?: string | null;
}

export function useUpdateMemberCreditEntry(memberId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: UpdateCreditEntryPayload) =>
      apiRequest('PATCH', `/api/admin/members/${memberId}/credit`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-credit', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member-details', memberId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: 'Credit entry updated',
        description: 'Manual credit entry has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update entry',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
