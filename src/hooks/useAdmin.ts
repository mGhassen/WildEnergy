import { useQuery } from '@tanstack/react-query';
import { adminApi, AdminClass } from '@/lib/api/admin';

export function useAdminClasses() {
  return useQuery<AdminClass[], Error>({
    queryKey: ['admin', 'classes'],
    queryFn: () => adminApi.getClasses(),
  });
}

export function useAdminCategories() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminApi.getCategories(),
  });
}

export function useAdminUsers() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
  });
}

export function useAdminTrainers() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'trainers'],
    queryFn: () => adminApi.getTrainers(),
  });
}

export function useAdminRegistrations() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'registrations'],
    queryFn: () => adminApi.getRegistrations(),
  });
}

export function useAdminSubscriptions() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => adminApi.getSubscriptions(),
  });
}

export function useAdminPayments() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'payments'],
    queryFn: () => adminApi.getPayments(),
  });
}

export function useAdminCheckins() {
  return useQuery<any[], Error>({
    queryKey: ['admin', 'checkins'],
    queryFn: () => adminApi.getCheckins(),
  });
}

export function useAdminDashboardStats() {
  return useQuery<any, Error>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboardStats(),
  });
}
