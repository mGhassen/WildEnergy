"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeOAuthCode } from "@/lib/oauth-exchange";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const handleCallback = async () => {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        router.replace(
          `/auth/login?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`,
        );
        return;
      }

      const type = searchParams.get("type");
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      if (type === "recovery" && accessToken && refreshToken) {
        router.replace(
          `/auth/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}`,
        );
        return;
      }

      if (type === "signup" && accessToken && refreshToken) {
        router.replace(
          `/auth/accept-invitation?access_token=${accessToken}&refresh_token=${refreshToken}`,
        );
        return;
      }

      const code = searchParams.get("code");
      if (!code) {
        router.replace("/auth/login?error=no_code");
        return;
      }

      const result = await exchangeOAuthCode(code);

      if (!result.ok) {
        router.replace(
          `/auth/login?error=exchange_failed&message=${encodeURIComponent(result.error || 'Exchange failed')}`,
        );
        return;
      }

      window.history.replaceState({}, "", "/auth/callback");
      router.replace("/auth/oauth-success");
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
