import { useQuery } from "@tanstack/react-query";

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
}

export function useAuth(): AuthState {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
  };
}