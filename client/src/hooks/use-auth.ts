import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface AppUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  isMember: boolean;
  status: string;
  profileImageUrl?: string;
}

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => Promise<void>;
}

const USER_QUERY_KEY = ["auth", "user"];

export function useAuth(): AuthState {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<AppUser | null>({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await apiFetch("/auth/me");
        if (!response) return null;
        return response;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  const refetchUser = async () => {
    await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
  };

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    refetchUser,
  };
}