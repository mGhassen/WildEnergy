"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, CheckCircle2, CircleDashed } from "lucide-react";
import { formatDate, formatDateTime, formatTime } from "@/lib/date";
import { parseRegistrationSessionSource } from "@/lib/registration-session-source";
import type { SubscriptionRegistration } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  attended: "bg-blue-100 text-blue-800 border-blue-200",
  absent: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  registered: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function MetaItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function SessionSourceBadge({
  registration,
}: {
  registration: SubscriptionRegistration;
}) {
  const { source, consumedGroupName, poolGroupNames } =
    parseRegistrationSessionSource(registration);

  if (!source) return null;

  if (source === "dedicated") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-xs font-normal">
          Dedicated
        </Badge>
        {consumedGroupName && (
          <span className="text-sm text-foreground">{consumedGroupName}</span>
        )}
      </div>
    );
  }

  if (source === "pool") {
    const otherGroups = poolGroupNames.filter(
      (name) => name !== consumedGroupName,
    );
    const hasPoolDetails = poolGroupNames.length > 0;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-xs font-normal">
          Pool
        </Badge>
        {consumedGroupName ? (
          <span className="text-sm text-foreground">{consumedGroupName}</span>
        ) : poolGroupNames.length === 1 ? (
          <span className="text-sm text-foreground">{poolGroupNames[0]}</span>
        ) : null}
        {hasPoolDetails && poolGroupNames.length > 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {otherGroups.length > 0
                  ? `+${otherGroups.length} eligible group${otherGroups.length === 1 ? "" : "s"}`
                  : `${poolGroupNames.length} groups`}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-w-xs p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1.5 text-xs font-medium text-popover-foreground">
                Pool covers
              </p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {poolGroupNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <Badge variant="outline" className="text-xs capitalize">
      {source}
    </Badge>
  );
}

type SubscriptionRegistrationCardProps = {
  registration: SubscriptionRegistration;
  onClick?: () => void;
};

export function SubscriptionRegistrationCard({
  registration,
  onClick,
}: SubscriptionRegistrationCardProps) {
  const checkin = Array.isArray(registration.checkins)
    ? registration.checkins[0]
    : null;
  const className = registration.course?.class?.name || "Course";
  const courseDate = registration.course?.course_date;
  const startTime = registration.course?.start_time;
  const endTime = registration.course?.end_time;
  const status = registration.status || "registered";
  const statusStyle =
    STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800 border-gray-200";

  const timeRange =
    startTime || endTime
      ? `${startTime ? formatTime(startTime) : ""}${startTime && endTime ? " – " : ""}${endTime ? formatTime(endTime) : ""}`
      : null;

  return (
    <TooltipProvider delayDuration={200}>
      <article
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          "rounded-lg border bg-card p-4 shadow-sm transition-colors",
          onClick && "cursor-pointer hover:bg-muted/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {className}
            </h3>
            {courseDate && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {formatDate(courseDate)}
                  {timeRange ? ` · ${timeRange}` : ""}
                </span>
              </div>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 capitalize text-xs", statusStyle)}
          >
            {status}
          </Badge>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetaItem label="Registration">
            <span className="font-mono text-xs sm:text-sm">
              REG-{String(registration.id).padStart(5, "0")}
            </span>
          </MetaItem>
          <MetaItem label="Registered">
            {formatDateTime(registration.registration_date)}
          </MetaItem>
          <MetaItem label="Check-in">
            {checkin?.checkin_time ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {formatDateTime(checkin.checkin_time)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CircleDashed className="h-3.5 w-3.5 shrink-0" />
                Not checked in
              </span>
            )}
          </MetaItem>
        </dl>

        {registration.session_source && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Session used
            </p>
            <SessionSourceBadge registration={registration} />
          </div>
        )}
      </article>
    </TooltipProvider>
  );
}
