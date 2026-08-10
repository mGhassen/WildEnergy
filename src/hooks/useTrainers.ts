import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainerApi, Trainer, CreateTrainerData, UpdateTrainerData } from '@/lib/api/trainers';
import { useToast } from '@/hooks/use-toast';

export function useTrainers() {
  return useQuery<Trainer[], Error>({
    queryKey: ['trainers'],
    queryFn: () => trainerApi.getTrainers(),
  });
}

export function useTrainer(trainerId: string) {
  return useQuery<Trainer, Error>({
    queryKey: ['trainer', trainerId],
    queryFn: () => trainerApi.getTrainer(trainerId),
    enabled: !!trainerId,
  });
}

export function useCreateTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTrainerData) => trainerApi.createTrainer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({
        title: 'Trainer created',
        description: 'The trainer has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create trainer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateTrainerData) => trainerApi.updateTrainer(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['trainer', data.trainerId] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({
        title: 'Trainer updated',
        description: 'The trainer has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update trainer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (trainerId: string) => trainerApi.deleteTrainer(trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({
        title: 'Trainer deleted',
        description: 'The trainer role has been removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete trainer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateTrainerFromMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string;
      data?: {
        specialization?: string;
        experienceYears?: number;
        bio?: string;
        certification?: string;
        hourlyRate?: number;
        status?: string;
      };
    }) => trainerApi.createFromMember(memberId, data),
    onSuccess: (_data, { memberId }) => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['memberDetails', memberId] });
      toast({
        title: 'Trainer created',
        description: 'Trainer role added on the same profile.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create trainer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateAccountFromTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      trainerId,
      data,
    }: {
      trainerId: string;
      data: { email: string; password: string; isAdmin?: boolean };
    }) => trainerApi.createAccount(trainerId, data),
    onSuccess: (_data, { trainerId }) => {
      queryClient.invalidateQueries({ queryKey: ['trainer', trainerId] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account created',
        description: 'Login account linked to this trainer.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useLinkTrainerAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ trainerId, accountId }: { trainerId: string; accountId: string }) => 
      trainerApi.linkAccount(trainerId, accountId),
    onSuccess: (data, { trainerId }) => {
      queryClient.invalidateQueries({ queryKey: ['trainer', trainerId] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account linked',
        description: data.message || 'Account has been successfully linked to trainer.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to link account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUnlinkTrainerAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (trainerId: string) => trainerApi.unlinkAccount(trainerId),
    onSuccess: (data, trainerId) => {
      queryClient.invalidateQueries({ queryKey: ['trainer', trainerId] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account unlinked',
        description: data.message || 'Account has been successfully unlinked from trainer.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to unlink account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
