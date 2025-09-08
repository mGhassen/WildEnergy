import { useQuery } from '@tanstack/react-query';
import { checkinApi, Checkin } from '@/lib/api/checkins';

// Member Checkins Hook
export const useMemberCheckins = () => {
  return useQuery<Checkin[]>({
    queryKey: ['/api/checkins'],
    queryFn: checkinApi.getCheckins,
  });
};