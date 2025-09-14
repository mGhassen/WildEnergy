import { Calendar, Clock, User } from "lucide-react";
import { parseISO, areIntervalsOverlapping, format } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

import { EventBlock } from "@/calendar/components/week-and-day-view/event-block";
import { CalendarTimeline } from "@/calendar/components/week-and-day-view/calendar-time-line";
import { DayViewMultiDayEventsRow } from "@/calendar/components/week-and-day-view/day-view-multi-day-events-row";
import { ResizableHourSidebar } from "@/calendar/components/week-and-day-view/resizable-hour-sidebar";

import { cn } from "@/lib/utils";
import { groupEvents, getEventBlockStyle, isWorkingHour, getCurrentEvents, getVisibleHours } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, setSelectedDate, users, visibleHours, workingHours, hourHeight } = useCalendar();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  // Fallback hours if none are generated - show full day from 6am to 11pm
  const displayHours = hours.length > 0 ? hours : Array.from({ length: 18 }, (_, i) => i + 6);

  const currentEvents = getCurrentEvents(singleDayEvents);

  const dayEvents = singleDayEvents.filter(event => {
    const eventDate = parseISO(event.startDate);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const groupedEvents = groupEvents(dayEvents);

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
                {displayHours.map((hour, index) => {
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
                    let style = getEventBlockStyle(event, selectedDate, groupIndex, groupedEvents.length, { from: earliestEventHour, to: latestEventHour });
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
                      <div key={event.id} className="absolute p-1" style={style}>
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

      <div className="hidden w-72 border-l bg-background md:block">
        <div className="py-3 pl-1">
          <ShadcnCalendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
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

        <div className="border-t px-4 py-3">
          <div className="text-sm font-medium mb-3">
            {selectedDate?.toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>

          <div className="flex w-full flex-col gap-2">
            {dayEvents.length > 0 ? (
              dayEvents.map((event) => {
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
        </div>
      </div>
    </div>
  );
}
