import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planApi, Plan, CreatePlanData, UpdatePlanData } from '@/lib/api/plans';
import { useToast } from '@/hooks/use-toast';

export function usePlans() {
  return useQuery<Plan[], Error>({
    queryKey: ['plans'],
    queryFn: () => planApi.getPlans(),
  });
}

export function usePlan(planId: number) {
  return useQuery<Plan, Error>({
    queryKey: ['plan', planId],
    queryFn: () => planApi.getPlan(planId),
    enabled: !!planId,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePlanData) => planApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Plan created',
        description: 'The plan has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create plan',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: UpdatePlanData }) => 
      planApi.updatePlan(planId, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Plan updated',
        description: 'The plan has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update plan',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (planId: number) => planApi.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({
        title: 'Plan deleted',
        description: 'The plan has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      if (error.linkedSubscriptions && error.linkedSubscriptions > 0) {
        toast({
          title: 'Cannot delete plan',
          description: `This plan is used in ${error.linkedSubscriptions} subscription(s). Please remove it from these subscriptions first.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to delete plan',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
    },
  });
}

export function useCheckPlanDeletion() {
  return useMutation({
    mutationFn: (planId: number) => planApi.checkPlanDeletion(planId),
  });
}
