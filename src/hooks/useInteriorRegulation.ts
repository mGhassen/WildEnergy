import { useQuery } from '@tanstack/react-query';
import { interiorRegulationApi, InteriorRegulationData } from '@/lib/api/interior-regulation';

export function useInteriorRegulation() {
  return useQuery<InteriorRegulationData, Error>({
    queryKey: ['/api/member/interior-regulation'],
    queryFn: () => interiorRegulationApi.getInteriorRegulation(),
  });
}
