import { useQuery } from '@tanstack/react-query';
import { subscriptionApi, Subscription } from '@/lib/api/subscriptions';

// Member Subscriptions Hooks
export const useMemberSubscriptions = () => {
  return useQuery<Subscription[]>({
    queryKey: ['/api/member/subscriptions'],
    queryFn: subscriptionApi.getMemberSubscriptions,
  });
};

export const useMemberSubscription = () => {
  return useQuery<Subscription>({
    queryKey: ['/api/member/subscription'],
    queryFn: subscriptionApi.getMemberSubscription,
  });
};