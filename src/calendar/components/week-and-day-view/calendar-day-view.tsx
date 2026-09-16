import { useMemo, useState } from "react";
import { parseISO, areIntervalsOverlapping, format, isSameDay } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

import { EventBlock } from "@/calendar/components/week-and-day-view/event-block";
import { CalendarTimeline } from "@/calendar/components/week-and-day-view/calendar-time-line";
import { DayViewMultiDayEventsRow } from "@/calendar/components/week-and-day-view/day-view-multi-day-events-row";
import { ResizableHourSidebar } from "@/calendar/components/week-and-day-view/resizable-hour-sidebar";

import { cn } from "@/lib/utils";
import { groupEvents, getEventBlockStyle, isWorkingHour, getVisibleHours } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

function getEventsForDate(events: IEvent[], date: Date) {
  return events.filter(event => isSameDay(parseISO(event.startDate), date));
}

function memberStatusBadgeClass(status: string) {
  if (status === "attended" || status === "checked_in") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (status === "absent") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (status === "cancelled") {
    return "bg-gray-100 text-gray-600 border-gray-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200";
}

function memberStatusLabel(status: string) {
  if (status === "attended") return "Attended";
  if (status === "checked_in") return "Checked in";
  if (status === "absent") return "Absent";
  if (status === "cancelled") return "Cancelled";
  if (status === "registered") return "Registered";
  return status;
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: IProps) {
  const {
    selectedDate,
    setSelectedDate,
    users,
    visibleHours,
    workingHours,
    hourHeight,
    registrations,
    checkins,
    hoveredEventId,
    enableEventSidebarPreview,
  } = useCalendar();
  const [hoveredDate, setHoveredDate] = useState<Date | undefined>();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  // Fallback hours if none are generated - show full day from 6am to 11pm
  const displayHours = hours.length > 0 ? hours : Array.from({ length: 18 }, (_, i) => i + 6);

  const dayEvents = getEventsForDate(singleDayEvents, selectedDate);
  const sidebarDate = hoveredDate ?? selectedDate;
  const sidebarEvents = getEventsForDate(singleDayEvents, sidebarDate);

  const groupedEvents = groupEvents(dayEvents);

  const hoveredEvent = useMemo(() => {
    if (!enableEventSidebarPreview || hoveredEventId == null) return null;
    return singleDayEvents.find(event => event.id === hoveredEventId)
      ?? multiDayEvents.find(event => event.id === hoveredEventId)
      ?? null;
  }, [enableEventSidebarPreview, hoveredEventId, singleDayEvents, multiDayEvents]);

  const hoveredEventMembers = useMemo(() => {
    if (!hoveredEvent) return [];

    return registrations
      .filter((reg: any) => reg.course_id === hoveredEvent.id)
      .map((reg: any) => {
        const checkin = checkins.find(
          (c: any) =>
            c.registration_id === reg.id ||
            c.member_id === reg.member_id ||
            c.member?.id === reg.member?.id ||
            c.member?.id === reg.member_id
        );

        let status = reg.status || "registered";
        if (checkin && status === "registered") {
          status = "checked_in";
        }

        const firstName = reg.member?.first_name || "Unknown";
        const lastName = reg.member?.last_name || "Member";

        return {
          id: reg.id,
          name: `${firstName} ${lastName}`.trim(),
          status,
        };
      });
  }, [hoveredEvent, registrations, checkins]);

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-h-0">
        <div>
          <DayViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} />

          {/* Day header */}
          <div className="relative z-20 flex border-b bg-background">
            <div className="w-18 flex-shrink-0"></div>
            <span className="flex-1 border-l py-2 text-center text-xs font-medium text-muted-foreground">
              {format(selectedDate, "EE")} <span className="font-semibold text-foreground">{format(selectedDate, "d")}</span>
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1" type="always">
          <div className="flex">
            {/* Hours column */}
            <ResizableHourSidebar displayHours={displayHours} view="day" />

            {/* Day grid */}
            <div className="relative flex-1 border-l bg-background">
              <div className="relative" style={{ height: `${displayHours.length * hourHeight}px` }}>
                {displayHours.map((hour) => {
                  const isDisabled = !isWorkingHour(selectedDate, hour, workingHours);

                  return (
                    <div key={hour} className={cn("relative border-b border-border/50", isDisabled && "bg-muted/30")} style={{ height: `${hourHeight}px` }}>
                      {/* Half-hour marker */}
                      <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed border-border/30"></div>
                    </div>
                  );
                })}

                {groupedEvents.map((group, groupIndex) =>
                  group.map(event => {
                    let style = getEventBlockStyle(event, selectedDate, groupIndex, groupedEvents.length, { from: earliestEventHour, to: latestEventHour }, hourHeight);
                    const hasOverlap = groupedEvents.some(
                      (otherGroup, otherIndex) =>
                        otherIndex !== groupIndex &&
                        otherGroup.some(otherEvent =>
                          areIntervalsOverlapping(
                            { start: parseISO(event.startDate), end: parseISO(event.endDate) },
                            { start: parseISO(otherEvent.startDate), end: parseISO(otherEvent.endDate) }
                          )
                        )
                    );

                    if (!hasOverlap) style = { ...style, width: "100%", left: "0%" };

                    return (
                      <div key={event.id} className="absolute px-1" style={style}>
                        <EventBlock event={event} />
                      </div>
                    );
                  })
                )}
              </div>

              <CalendarTimeline firstVisibleHour={earliestEventHour} lastVisibleHour={latestEventHour} selectedDate={selectedDate} view="day" />
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="hidden w-72 border-l bg-background md:flex md:flex-col">
        <div className="py-3 pl-1">
          <ShadcnCalendar
            mode="single"
            selected={selectedDate}
            onSelect={date => {
              setSelectedDate(date);
              setHoveredDate(undefined);
            }}
            onDayMouseEnter={date => setHoveredDate(date)}
            onDayMouseLeave={() => setHoveredDate(undefined)}
            modifiers={{
              preview: date => hoveredDate !== undefined && isSameDay(date, hoveredDate) && !isSameDay(date, selectedDate),
            }}
            modifiersClassNames={{
              preview: "bg-accent/60 text-accent-foreground rounded-md",
            }}
            captionLayout="dropdown"
            fromYear={2020}
            toYear={2030}
            className="bg-transparent p-0"
            classNames={{
              day: "h-10 w-10 text-xs",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
            }}
            required
          />
        </div>

        <div className="border-t px-4 py-3 flex-1 min-h-0 flex flex-col">
          {hoveredEvent ? (
            <>
              <div className="text-sm font-medium mb-1">{hoveredEvent.title}</div>
              <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
                <div>
                  {format(parseISO(hoveredEvent.startDate), "h:mm a")} - {format(parseISO(hoveredEvent.endDate), "h:mm a")}
                </div>
                <div>Trainer: {hoveredEvent.user.name}</div>
                {hoveredEvent.category?.name && <div>Category: {hoveredEvent.category.name}</div>}
              </div>

              <div className="text-xs font-medium text-muted-foreground mb-2">
                Members ({hoveredEventMembers.length})
              </div>

              <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2 pr-2">
                  {hoveredEventMembers.length > 0 ? (
                    hoveredEventMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1.5"
                      >
                        <span className="text-xs font-medium truncate">{member.name}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] shrink-0", memberStatusBadgeClass(member.status))}
                        >
                          {memberStatusLabel(member.status)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm italic text-muted-foreground py-4">
                      No members registered
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="text-sm font-medium mb-3">
                {sidebarDate.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>

              <div className="flex w-full flex-col gap-2">
                {sidebarEvents.length > 0 ? (
                  sidebarEvents.map((event) => {
                    const user = users.find(user => user.id === event.user.id);

                    return (
                      <div
                        key={event.id}
                        className="bg-muted after:bg-primary/70 relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full"
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-muted-foreground text-xs">
                          {format(parseISO(event.startDate), "h:mm a")} - {format(parseISO(event.endDate), "h:mm a")}
                        </div>
                        {user && (
                          <div className="text-muted-foreground text-xs mt-1">
                            {user.name}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-sm italic text-muted-foreground py-4">
                    No events scheduled for this day
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
