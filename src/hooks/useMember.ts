import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export function useMemberCourses() {
  return useQuery({
    queryKey: ['/api/member/courses'],
    queryFn: () => apiFetch('/api/member/courses'),
  });
}

export function useMemberSubscriptions() {
  return useQuery({
    queryKey: ['/api/member/subscriptions'],
    queryFn: () => apiFetch('/api/member/subscriptions'),
  });
}

export function useMemberCategories() {
  return useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => apiFetch('/api/categories'),
  });
}
