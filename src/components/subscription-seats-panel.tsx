"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subscriptionApi } from "@/lib/api/subscriptions";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Mail, X } from "lucide-react";

type SeatMember = {
  id: string;
  profiles?: { first_name?: string; last_name?: string } | null;
  accounts?: { email?: string } | null;
};

type Seat = {
  id: number;
  member_id: string;
  role: "owner" | "member";
  status: string;
  members?: SeatMember | null;
};

type Invite = {
  id: number;
  email: string;
  status: string;
  expires_at: string;
};

type MemberOption = {
  id: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type Props = {
  subscriptionId: number;
  maxSeats: number;
  seats?: Seat[];
  invites?: Invite[];
  members?: MemberOption[];
  canManage: boolean;
  apiMode?: "admin" | "member";
};

function memberLabel(m: MemberOption) {
  const first = m.firstName || m.first_name || "";
  const last = m.lastName || m.last_name || "";
  const name = `${first} ${last}`.trim();
  return name ? `${name}${m.email ? ` (${m.email})` : ""}` : m.email || m.id;
}

function seatLabel(seat: Seat) {
  const first = seat.members?.profiles?.first_name || "";
  const last = seat.members?.profiles?.last_name || "";
  const name = `${first} ${last}`.trim();
  const email = seat.members?.accounts?.email;
  return name || email || seat.member_id;
}

export function SubscriptionSeatsPanel({
  subscriptionId,
  maxSeats,
  seats = [],
  invites = [],
  members = [],
  canManage,
  apiMode = "admin",
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState("");
  const [email, setEmail] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchedMembers, setSearchedMembers] = useState<MemberOption[]>([]);

  const activeSeats = seats.filter((s) => s.status === "active");
  const pendingInvites = invites.filter((i) => i.status === "pending");
  const used = activeSeats.length + pendingInvites.length;
  const isGroup = maxSeats > 1;

  const seatedIds = useMemo(
    () => new Set(activeSeats.map((s) => s.member_id)),
    [activeSeats],
  );

  const memberOptions = apiMode === "member" ? searchedMembers : members;
  const attachableMembers = useMemo(
    () => memberOptions.filter((m) => !seatedIds.has(m.id)),
    [memberOptions, seatedIds],
  );

  useEffect(() => {
    if (apiMode !== "member" || searchQ.trim().length < 2) {
      setSearchedMembers([]);
      return;
    }
    const t = setTimeout(() => {
      apiRequest("GET", `/api/member/members/search?q=${encodeURIComponent(searchQ.trim())}`)
        .then((data) => setSearchedMembers(Array.isArray(data) ? data : []))
        .catch(() => setSearchedMembers([]));
    }, 250);
    return () => clearTimeout(t);
  }, [apiMode, searchQ]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription", subscriptionId] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/member/subscriptions"] });
  };

  const attachMutation = useMutation({
    mutationFn: async () => {
      if (apiMode === "member") {
        return subscriptionApi.memberInviteToSubscription(subscriptionId, {
          memberId,
        });
      }
      return subscriptionApi.attachSeat(subscriptionId, memberId);
    },
    onSuccess: () => {
      setMemberId("");
      invalidate();
      toast({ title: "Seat added" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add seat",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (apiMode === "member") {
        return subscriptionApi.memberInviteToSubscription(subscriptionId, {
          email,
        });
      }
      return subscriptionApi.inviteToSubscription(subscriptionId, email);
    },
    onSuccess: (data) => {
      setEmail("");
      invalidate();
      toast({
        title: data?.attached ? "Member attached" : "Invite sent",
        description: data?.attached
          ? "Existing member was added to the plan."
          : "Invitation email queued for that address.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to invite",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const revokeSeatMutation = useMutation({
    mutationFn: (seatId: number) =>
      apiMode === "member"
        ? subscriptionApi.memberRevokeSeat(subscriptionId, seatId)
        : subscriptionApi.revokeSeat(subscriptionId, seatId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Seat revoked" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to revoke seat",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId: number) =>
      apiMode === "member"
        ? subscriptionApi.memberRevokeInvite(subscriptionId, inviteId)
        : subscriptionApi.revokeInvite(subscriptionId, inviteId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Invite revoked" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to revoke invite",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  if (!isGroup) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Group seats</span>
          <Badge variant="secondary">
            {used}/{maxSeats}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {activeSeats.map((seat) => (
            <div
              key={seat.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{seatLabel(seat)}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {seat.role}
                </p>
              </div>
              {canManage && seat.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => revokeSeatMutation.mutate(seat.id)}
                  disabled={revokeSeatMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {pendingInvites.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Pending invites
            </p>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                    disabled={revokeInviteMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {canManage && used < maxSeats && (
          <div className="space-y-3 border-t pt-3">
            {apiMode === "member" && (
              <Input
                placeholder="Search members by name or email"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Attach existing member" />
                </SelectTrigger>
                <SelectContent>
                  {attachableMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {memberLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => attachMutation.mutate()}
                disabled={!memberId || attachMutation.isPending}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Attach
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="Invite by email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => inviteMutation.mutate()}
                disabled={!email.includes("@") || inviteMutation.isPending}
              >
                <Mail className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
