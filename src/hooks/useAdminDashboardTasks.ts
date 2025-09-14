import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';

interface PendingAccount {
  account_id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface CourseNeedingCheck {
  id: number;
  course_date: string;
  start_time: string;
  end_time: string;
  status: string;
  max_participants: number;
  current_participants: number;
  class: {
    id: number;
    name: string;
    category: {
      name: string;
      color: string;
    };
  };
  trainer: {
    id: number;
    member: {
      first_name: string;
      last_name: string;
    };
  };
}

interface DashboardTasks {
  pendingAccounts: {
    count: number;
    accounts: PendingAccount[];
  };
  coursesNeedingCheck: {
    count: number;
    courses: CourseNeedingCheck[];
  };
}

export function useAdminDashboardTasks() {
  return useQuery<DashboardTasks>({
    queryKey: ['admin-dashboard-tasks'],
    queryFn: () => adminApi.getDashboardTasks(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}
