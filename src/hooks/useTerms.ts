import { useQuery } from '@tanstack/react-query';
import { termsApi, TermsData } from '@/lib/api/terms';

export function useTerms() {
  return useQuery<TermsData, Error>({
    queryKey: ['/api/terms'],
    queryFn: () => termsApi.getTerms(),
    staleTime: 0, // Always refetch to get latest active terms
    refetchOnWindowFocus: true,
  });
}
