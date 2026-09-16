"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";

export default function AcceptPlanInviteClient({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteToken, setInviteToken] = useState("");
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasInviteSession, setHasInviteSession] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenRaw = searchParams.token;
    const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
    if (token) setInviteToken(token);

    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash?.includes("access_token")) {
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        setAccessToken(params.get("access_token"));
        setRefreshToken(params.get("refresh_token"));
        setHasInviteSession(true);
      }
    }

    if (token) {
      fetch(`/api/auth/accept-plan-invite?token=${encodeURIComponent(token)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setInviteInfo(data);
        })
        .catch(() => setError("Failed to load invite"));
    }
  }, [searchParams]);

  const acceptInvite = async (bearer: string) => {
    const res = await fetch("/api/auth/accept-plan-invite", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: inviteToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to accept invite");
    return data;
  };

  const handleAccept = async () => {
    setIsLoading(true);
    setError("");
    try {
      const supabase = createSupabaseClient();
      let bearer = accessToken;

      if (hasInviteSession) {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (!accessToken) {
          throw new Error("Invalid invitation link. Open the link from your email.");
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });
        if (sessionError) throw new Error(sessionError.message);

        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw new Error(pwError.message);

        const { data: sessionData } = await supabase.auth.getSession();
        bearer = sessionData.session?.access_token || bearer;
      }

      if (!bearer) {
        const { data: sessionData } = await supabase.auth.getSession();
        bearer = sessionData.session?.access_token || null;
      }

      if (!bearer) {
        throw new Error("Please open the invite link from your email, or sign in first");
      }

      await acceptInvite(bearer);
      setSuccess(true);
      toast({ title: "You're on the group plan" });
      setTimeout(() => router.push("/member/subscriptions"), 1500);
    } catch (e: any) {
      setError(e.message || "Failed to accept invite");
    } finally {
      setIsLoading(false);
    }
  };

  const planName =
    inviteInfo?.subscriptions?.plan?.name || "group plan";

  return (
    <div className="w-full">
      <CardHeader>
        <CardTitle>Join group plan</CardTitle>
        <CardDescription>
          {inviteInfo
            ? `You've been invited to ${planName}`
            : "Accept your plan invitation"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Seat added. Redirecting to your subscriptions…
            </AlertDescription>
          </Alert>
        )}

        {hasInviteSession && !success && (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Set a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {!success && (
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isLoading || !inviteToken}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept invitation
          </Button>
        )}
      </CardContent>
    </div>
  );
}
