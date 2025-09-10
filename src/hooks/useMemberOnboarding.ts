import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingStatus {
  member_id: string;
  account_id: string;
  personal_info_completed: boolean;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  onboarding_completed: boolean;
  onboarding_completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStatusResponse {
  success: boolean;
  data?: {
    onboardingCompleted: boolean;
    termsAccepted: boolean;
    hasPersonalInfo: boolean;
    user: any;
  };
  error?: string;
}

export interface UpdateOnboardingData {
  personal_info_completed?: boolean;
  terms_accepted?: boolean;
  terms_accepted_at?: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string;
}

export function useMemberOnboarding(memberId: string) {
  return useQuery<OnboardingStatus, Error>({
    queryKey: ['member-onboarding', memberId],
    queryFn: () => apiRequest('GET', `/api/member/onboarding/${memberId}`),
    enabled: !!memberId,
  });
}

export function useOnboardingStatus() {
  return useQuery<OnboardingStatusResponse, Error>({
    queryKey: ['/api/member/onboarding/status'],
    queryFn: () => apiRequest('GET', '/api/member/onboarding/status'),
  });
}

export function useUpdateMemberOnboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateOnboardingData }) => 
      apiRequest('PUT', `/api/member/onboarding/${memberId}`, data),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['member-onboarding', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      toast({
        title: 'Onboarding updated',
        description: 'Your onboarding progress has been saved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update onboarding',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useAcceptTerms() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) => 
      apiRequest('POST', `/api/member/onboarding/${memberId}/accept-terms`),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['member-onboarding', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      toast({
        title: 'Terms accepted',
        description: 'You have successfully accepted the terms and conditions.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to accept terms',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
