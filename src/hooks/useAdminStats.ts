import { useQuery } from '@tanstack/react-query';
import { statsApi, type StatsFilters, type AdminStatsResponse } from '@/lib/api/stats';

export function useAdminStats(filters: StatsFilters) {
  return useQuery<AdminStatsResponse, Error>({
    queryKey: ['admin', 'stats', filters],
    queryFn: () => statsApi.getStats(filters),
    enabled: Boolean(filters.from && filters.to),
    staleTime: 60_000,
  });
}
