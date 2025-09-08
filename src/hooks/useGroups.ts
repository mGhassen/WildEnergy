import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupApi, Group, CreateGroupData, UpdateGroupData } from '@/lib/api/groups';
import { useToast } from '@/hooks/use-toast';

export function useGroups() {
  return useQuery<Group[], Error>({
    queryKey: ['groups'],
    queryFn: () => groupApi.getGroups(),
  });
}

export function useGroup(groupId: number) {
  return useQuery<Group, Error>({
    queryKey: ['group', groupId],
    queryFn: () => groupApi.getGroup(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateGroupData) => groupApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: 'Group created successfully',
        description: 'The group has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating group',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: UpdateGroupData }) => 
      groupApi.updateGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: 'Group updated successfully',
        description: 'The group has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating group',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (groupId: number) => groupApi.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({
        title: 'Group deleted successfully',
        description: 'The group has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      if (error.linkedPlans && error.linkedPlans.length > 0) {
        toast({
          title: 'Cannot delete group',
          description: `This group is used in the following plans: ${error.linkedPlans.join(', ')}. Please remove it from these plans first.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error deleting group',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
    },
  });
}

export function useCheckGroupDeletion() {
  return useMutation({
    mutationFn: (groupId: number) => groupApi.checkGroupDeletion(groupId),
  });
}