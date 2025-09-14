import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingStatus {
  member_id: string;
  account_id: string;
  personal_info_completed: boolean;
  discovery_source?: string;
  discovery_completed: boolean;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  terms_version_id?: string;
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
    personalInfoCompleted: boolean;
    physicalProfileCompleted: boolean;
    discoveryCompleted: boolean;
    physicalProfile?: {
      gender: string;
      weight: number;
      height: number;
      goal: string;
      activity_level: string;
    };
    discoverySource?: string;
    termsAcceptedAt?: string;
    termsVersion?: string;
    termsTitle?: string;
    termsEffectiveDate?: string;
    terms_version_id?: string;
    user: any;
  };
  error?: string;
}

export interface UpdateOnboardingData {
  personal_info_completed?: boolean;
  physical_profile_completed?: boolean;
  physical_profile?: {
    gender: string;
    weight: number | null;
    height: number | null;
    activity_level: string;
    goal: string;
  };
  discovery_source?: string;
  discovery_completed?: boolean;
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
    staleTime: 0, // Always consider data stale to force refetch
    refetchOnMount: true, // Refetch when component mounts
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
      queryClient.invalidateQueries({ queryKey: ['/api/member/onboarding/status'] });
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
      // Invalidate all related queries to prevent stale data issues
      queryClient.invalidateQueries({ queryKey: ['/api/member/onboarding/status'] });
      queryClient.invalidateQueries({ queryKey: ['member-onboarding', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      queryClient.invalidateQueries({ queryKey: ['terms-re-acceptance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/terms'] });
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

export function useReAcceptTerms() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => apiRequest('POST', '/api/member/terms/re-accept'),
    onSuccess: () => {
      // Invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/member/onboarding/status'] });
      queryClient.invalidateQueries({ queryKey: ['member'] });
      queryClient.invalidateQueries({ queryKey: ['/api/terms'] });
      queryClient.invalidateQueries({ queryKey: ['terms-re-acceptance'] });
      toast({
        title: 'Terms updated',
        description: 'You have successfully accepted the updated terms and conditions.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to accept updated terms',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
