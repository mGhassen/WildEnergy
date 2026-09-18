"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Mail,
  MoreVertical,
  Phone,
  Pin,
  QrCode,
  Search,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NotesHoverIcon } from "@/components/notes-hover-icon";
import { formatDateTime } from "@/lib/date";
import { parseRegistrationSessionSource } from "@/lib/registration-session-source";
import { cn } from "@/lib/utils";

export type CourseParticipantRegistration = {
  id: number;
  registration_date: string;
  status: string;
  notes?: string;
  qr_code: string;
  subscription_id?: number | null;
  session_source?: "dedicated" | "pool" | null;
  group_id?: number | null;
  pool_id?: number | null;
  group?: { id: number; name: string; color?: string } | null;
  pool?: {
    id: number;
    plan_session_pool_groups?: Array<{
      group_id: number;
      groups?: { id: number; name: string; color?: string } | null;
    }>;
  } | null;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
};

export type CourseParticipantCheckin = {
  id: number;
  checkin_time: string;
  registration_id?: number;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

type StatusFilter = "all" | "registered" | "attended" | "absent" | "cancelled";

type CourseParticipantsListProps = {
  registrations: CourseParticipantRegistration[];
  checkins: CourseParticipantCheckin[];
  checkInPending?: boolean;
  onAddMembers: () => void;
  onQRClick: (qrCode: string, event?: React.MouseEvent) => void;
  onCheckIn: (registrationId: number) => void;
  onCancel: (registration: CourseParticipantRegistration) => void;
  onRestore: (registration: CourseParticipantRegistration) => void;
  onDelete: (registration: CourseParticipantRegistration) => void;
};

const PER_PAGE = 10;

function statusLabel(status: string) {
  switch (status) {
    case "attended":
      return "Attended";
    case "absent":
      return "Absent";
    case "cancelled":
      return "Cancelled";
    case "registered":
      return "Registered";
    default:
      return status;
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "attended":
      return "bg-green-500/10 text-green-700 border-green-500/25";
    case "absent":
      return "bg-destructive/10 text-destructive border-destructive/25";
    case "cancelled":
      return "bg-amber-500/15 text-amber-800 border-amber-500/35 dark:text-amber-400";
    case "registered":
      return "bg-primary/10 text-primary border-primary/25";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function groupColor(registration: CourseParticipantRegistration): string | undefined {
  if (registration.group?.color) return registration.group.color;
  const fromPool = registration.pool?.plan_session_pool_groups?.find(
    (g) => g.groups?.color,
  )?.groups?.color;
  return fromPool;
}

function poolGroupPins(registration: CourseParticipantRegistration) {
  const rows = registration.pool?.plan_session_pool_groups ?? [];
  return rows
    .map((row) => ({
      id: row.groups?.id ?? row.group_id,
      name: row.groups?.name,
      color: row.groups?.color,
    }))
    .filter((g): g is { id: number; name: string; color: string | undefined } => Boolean(g.name));
}

function SessionSourcePins({
  registration,
}: {
  registration: CourseParticipantRegistration;
}) {
  const details = parseRegistrationSessionSource(registration);
  const consumedColor = groupColor(registration);

  if (!details.source) {
    return <p className="text-xs text-muted-foreground">No session source</p>;
  }

  const groupPins =
    details.source === "pool"
      ? (() => {
          const fromPool = poolGroupPins(registration);
          if (fromPool.length > 0) return fromPool;
          if (details.consumedGroupName) {
            return [
              {
                id: registration.group_id ?? 0,
                name: details.consumedGroupName,
                color: consumedColor,
              },
            ];
          }
          return [];
        })()
      : details.consumedGroupName
        ? [
            {
              id: registration.group_id ?? registration.group?.id ?? 0,
              name: details.consumedGroupName,
              color: consumedColor,
            },
          ]
        : [];

  const showUsedMark = details.source === "pool" && groupPins.length > 1;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
          details.source === "dedicated"
            ? "border-primary/25 bg-primary/5 text-primary"
            : "border-border bg-background text-muted-foreground",
        )}
        title={details.source === "dedicated" ? "Dedicated session" : "Pool session"}
      >
        {details.source === "dedicated" ? (
          <Pin className="h-3 w-3" />
        ) : (
          <Layers className="h-3 w-3" />
        )}
        {details.source === "dedicated" ? "Dedicated" : "Pool"}
      </span>

      {groupPins.map((g) => {
        const isConsumed =
          details.consumedGroupName != null &&
          g.name === details.consumedGroupName;
        return (
          <span
            key={`${g.id}-${g.name}`}
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]",
              isConsumed && showUsedMark
                ? "border-foreground/20 bg-foreground/5 text-foreground"
                : "border-border bg-background text-muted-foreground",
            )}
            title={
              isConsumed && showUsedMark
                ? `Session taken from ${g.name}`
                : g.name
            }
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: g.color || consumedColor || "hsl(var(--muted-foreground))",
              }}
            />
            <span className="truncate">{g.name}</span>
            {isConsumed && showUsedMark ? (
              <Check className="h-3 w-3 shrink-0 opacity-70" aria-label="used" />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function CourseParticipantsList({
  registrations,
  checkins,
  checkInPending,
  onAddMembers,
  onQRClick,
  onCheckIn,
  onCancel,
  onRestore,
  onDelete,
}: CourseParticipantsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const base = {
      all: registrations.length,
      registered: 0,
      attended: 0,
      absent: 0,
      cancelled: 0,
      checkedIn: 0,
      guests: 0,
    };
    for (const r of registrations) {
      if (r.status === "registered") base.registered += 1;
      else if (r.status === "attended") base.attended += 1;
      else if (r.status === "absent") base.absent += 1;
      else if (r.status === "cancelled") base.cancelled += 1;
      if (!r.subscription_id) base.guests += 1;
      const hasCheckin = checkins.some((c) => c.registration_id === r.id);
      if (hasCheckin) base.checkedIn += 1;
    }
    return base;
  }, [registrations, checkins]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const name = `${r.member?.first_name ?? ""} ${r.member?.last_name ?? ""}`.toLowerCase();
      const email = (r.member?.email ?? "").toLowerCase();
      const phone = (r.member?.phone ?? "").toLowerCase();
      const regCode = `reg-${String(r.id).padStart(5, "0")}`;
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        regCode.includes(q) ||
        String(r.id).includes(q)
      );
    });
  }, [registrations, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "registered", label: "Registered", count: counts.registered },
    { key: "attended", label: "Attended", count: counts.attended },
    { key: "absent", label: "Absent", count: counts.absent },
    { key: "cancelled", label: "Cancelled", count: counts.cancelled },
  ];

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.all} registered · {counts.checkedIn} checked in
              {counts.guests > 0 ? ` · ${counts.guests} guest${counts.guests === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onAddMembers}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Members
          </Button>
        </div>

        {registrations.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, phone…"
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === f.key
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {f.label}
                  <span className="tabular-nums opacity-70">{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {registrations.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">No participants yet</p>
            <p className="mt-1 text-sm">Add members to fill this course.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground">
            <p className="font-medium text-foreground">No matches</p>
            <p className="mt-1 text-sm">Try another search or status filter.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y border-t">
              {pageItems.map((registration) => {
                const checkin = checkins.find(
                  (c) => c.registration_id === registration.id,
                );
                const first = registration.member?.first_name || "Unknown";
                const last = registration.member?.last_name || "Member";
                const memberId = registration.member?.id;
                const isGuest = !registration.subscription_id;

                return (
                  <li
                    key={registration.id}
                    className={cn(
                      "px-4 py-4 transition-colors sm:px-6",
                      registration.status === "cancelled" && "opacity-70",
                      "hover:bg-muted/40",
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      {/* Identity */}
                      <div className="flex min-w-0 flex-1 gap-3">
                        <button
                          type="button"
                          className="shrink-0"
                          onClick={() => {
                            if (memberId) router.push(`/admin/members/${memberId}`);
                          }}
                          aria-label={`Open ${first} ${last}`}
                        >
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className="text-sm">
                              {first[0]}
                              {last[0]}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="truncate text-left font-medium hover:underline"
                              onClick={() => {
                                if (memberId) {
                                  router.push(`/admin/members/${memberId}`);
                                }
                              }}
                            >
                              {first} {last}
                            </button>
                            <NotesHoverIcon
                              notes={registration.notes}
                              ariaLabel="View registration notes"
                            />
                            <span className="font-mono text-[11px] text-muted-foreground">
                              REG-{String(registration.id).padStart(5, "0")}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-3">
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              <span className="truncate">
                                {registration.member?.email || "No email"}
                              </span>
                            </span>
                            {registration.member?.phone ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                {registration.member.phone}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Status + actions */}
                      <div className="flex shrink-0 items-center gap-2 self-start lg:pl-4">
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusBadgeClass(registration.status))}
                        >
                          {statusLabel(registration.status)}
                        </Badge>
                        {registration.status !== "cancelled" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Open QR check-in"
                            onClick={(e) => onQRClick(registration.qr_code, e)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Registration actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {registration.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => onQRClick(registration.qr_code)}
                              >
                                <QrCode className="mr-2 h-4 w-4" />
                                View QR
                              </DropdownMenuItem>
                            )}
                            {(registration.status === "registered" ||
                              registration.status === "absent") && (
                              <DropdownMenuItem
                                disabled={checkInPending}
                                onClick={() => onCheckIn(registration.id)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Check in
                              </DropdownMenuItem>
                            )}
                            {registration.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => onCancel(registration)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                            {registration.status === "cancelled" && (
                              <DropdownMenuItem onClick={() => onRestore(registration)}>
                                <Check className="mr-2 h-4 w-4" />
                                Restore
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onDelete(registration)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Data sections */}
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <section className="rounded-md border bg-muted/20 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Session
                        </p>
                        <div className="mt-1.5 space-y-1">
                          {isGuest ? (
                            <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                              Guest
                            </p>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                              onClick={() =>
                                router.push(
                                  `/admin/subscriptions/${registration.subscription_id}`,
                                )
                              }
                            >
                              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                              Subscription #{registration.subscription_id}
                            </button>
                          )}
                          <SessionSourcePins registration={registration} />
                        </div>
                      </section>

                      <section className="rounded-md border bg-muted/20 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Check-in
                        </p>
                        <div className="mt-1.5">
                          {checkin?.checkin_time ? (
                            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {formatDateTime(checkin.checkin_time)}
                            </p>
                          ) : registration.status === "cancelled" ? (
                            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <XCircle className="h-3.5 w-3.5" />
                              Cancelled
                            </p>
                          ) : (
                            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              Not checked in
                            </p>
                          )}
                        </div>
                      </section>

                      <section className="rounded-md border bg-muted/20 px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Registered
                        </p>
                        <p className="mt-1.5 text-sm font-medium">
                          {formatDateTime(registration.registration_date)}
                        </p>
                        {registration.notes?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {registration.notes}
                          </p>
                        ) : null}
                      </section>
                    </div>
                  </li>
                );
              })}
            </ul>

            {filtered.length > PER_PAGE && (
              <div className="flex items-center justify-between border-t px-4 py-3 sm:px-6">
                <p className="text-sm text-muted-foreground">
                  {(safePage - 1) * PER_PAGE + 1}–
                  {Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm tabular-nums">
                    {safePage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage === totalPages}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
