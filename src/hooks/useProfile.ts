import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  profile_id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  profile_email?: string; // Contact email, separate from account email
  date_of_birth?: string;
  address?: string;
  profession?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_email?: string; // Contact email, separate from account email
  date_of_birth?: string;
  address?: string;
  profession?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  profile_image_url?: string;
}

export function useProfile(memberId: string) {
  return useQuery<Profile, Error>({
    queryKey: ['profile', memberId],
    queryFn: () => apiRequest('GET', `/api/member/profile/${memberId}`),
    enabled: !!memberId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: UpdateProfileData }) => 
      apiRequest('PUT', `/api/member/profile/${memberId}`, data),
    onSuccess: (_, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['profile', memberId] });
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Also invalidate user data
      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update profile',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
