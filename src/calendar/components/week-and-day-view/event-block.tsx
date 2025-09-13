import { cva } from "class-variance-authority";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { QrCode } from "lucide-react";
import { useState } from "react";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { DraggableEvent } from "@/calendar/components/dnd/draggable-event";
import { EventDetailsDialog } from "@/calendar/components/dialogs/event-details-dialog";
import QRGenerator from "@/components/qr-generator";

import { cn } from "@/lib/utils";

import type { HTMLAttributes } from "react";
import type { IEvent } from "@/calendar/interfaces";
import type { VariantProps } from "class-variance-authority";

const calendarWeekEventCardVariants = cva(
  "flex select-none flex-col gap-0.5 truncate whitespace-nowrap rounded-md border px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      color: {
        // Colored and mixed variants
        blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 [&_.event-dot]:fill-blue-600",
        green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300 [&_.event-dot]:fill-green-600",
        red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 [&_.event-dot]:fill-red-600",
        yellow: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300 [&_.event-dot]:fill-yellow-600",
        purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 [&_.event-dot]:fill-purple-600",
        orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 [&_.event-dot]:fill-orange-600",
        gray: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 [&_.event-dot]:fill-neutral-600",

        // Dot variants
        "blue-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-blue-600",
        "green-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-green-600",
        "red-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-red-600",
        "orange-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-orange-600",
        "purple-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-purple-600",
        "yellow-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-yellow-600",
        "gray-dot": "bg-neutral-50 dark:bg-neutral-900 [&_.event-dot]:fill-neutral-600",
      },
      isRegistered: {
        true: "border-l-4 border-l-green-500",
        false: "",
      },
    },
    defaultVariants: {
      color: "blue-dot",
      isRegistered: false,
    },
  }
);

interface IProps extends HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof calendarWeekEventCardVariants>, "color"> {
  event: IEvent;
}

export function EventBlock({ event, className }: IProps) {
  const { badgeVariant, registrations } = useCalendar();
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const durationInMinutes = differenceInMinutes(end, start);
  const heightInPixels = (durationInMinutes / 60) * 96 - 8;

  const color = (badgeVariant === "dot" ? `${event.color}-dot` : event.color) as VariantProps<typeof calendarWeekEventCardVariants>["color"];

  const calendarWeekEventCardClasses = cn(
    calendarWeekEventCardVariants({ 
      color, 
      isRegistered: event.isRegistered || false,
      className 
    }), 
    durationInMinutes < 35 && "py-0 justify-center"
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (e.currentTarget instanceof HTMLElement) e.currentTarget.click();
    }
  };

  const handleQRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Get QR code from registration data
    const userRegistration = registrations.find(reg => reg.course_id === event.id && reg.status === 'registered');
    if (userRegistration?.qr_code) {
      setSelectedQR(userRegistration.qr_code);
    }
  };

  return (
    <>
      <DraggableEvent event={event}>
        <EventDetailsDialog event={event}>
          <div role="button" tabIndex={0} className={calendarWeekEventCardClasses} style={{ height: `${heightInPixels}px` }} onKeyDown={handleKeyDown}>
            <div className="flex items-center gap-1.5 truncate">
              {["mixed", "dot"].includes(badgeVariant) && (
                <svg width="8" height="8" viewBox="0 0 8 8" className="event-dot shrink-0">
                  <circle cx="4" cy="4" r="4" />
                </svg>
              )}

              <p className="truncate font-semibold">{event.title}</p>
              
              {event.isRegistered && (
                <button
                  onClick={handleQRClick}
                  className="shrink-0 p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                  title="Show QR Code"
                >
                  <QrCode className="w-4 h-4 text-green-600 dark:text-green-400" />
                </button>
              )}
            </div>

            {durationInMinutes > 25 && (
              <p>
                {format(start, "h:mm a")} - {format(end, "h:mm a")}
              </p>
            )}
          </div>
        </EventDetailsDialog>
      </DraggableEvent>

      {/* QR Code Modal - Same as browse courses */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center text-foreground">Your QR Code</h3>
            <div className="mb-4">
              <div className="w-[300px] h-[300px] bg-muted rounded flex items-center justify-center">
                {selectedQR ? (
                  <QRGenerator value={selectedQR} size={300} />
                ) : (
                  <span className="text-muted-foreground">No QR Code Available</span>
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">QR Code Value:</p>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all text-foreground">{selectedQR}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
