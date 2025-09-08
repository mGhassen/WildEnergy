import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainerApi, Trainer, CreateTrainerData, UpdateTrainerData } from '@/lib/api/trainers';
import { useToast } from '@/hooks/use-toast';

export function useTrainers() {
  return useQuery<Trainer[], Error>({
    queryKey: ['trainers'],
    queryFn: () => trainerApi.getTrainers(),
  });
}

export function useTrainer(trainerId: number) {
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
    mutationFn: ({ trainerId, data }: { trainerId: number; data: UpdateTrainerData }) => 
      trainerApi.updateTrainer(trainerId, data),
    onSuccess: (_, { trainerId }) => {
      queryClient.invalidateQueries({ queryKey: ['trainer', trainerId] });
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
    mutationFn: (trainerId: number) => trainerApi.deleteTrainer(trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({
        title: 'Trainer deleted',
        description: 'The trainer has been successfully deleted.',
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
