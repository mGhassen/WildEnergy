"use client";

import { MessageSquare } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type NotesHoverIconProps = {
  notes?: string | null;
  ariaLabel?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function NotesHoverIcon({
  notes,
  ariaLabel = "View notes",
  className,
  onClick,
}: NotesHoverIconProps) {
  if (!notes?.trim()) return null;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            className,
          )}
          aria-label={ariaLabel}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(e);
          }}
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm whitespace-pre-wrap break-words">{notes}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
