import { startOfWeek, addDays, format, parseISO, isSameDay, areIntervalsOverlapping } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { EventBlock } from "@/calendar/components/week-and-day-view/event-block";
import { CalendarTimeline } from "@/calendar/components/week-and-day-view/calendar-time-line";
import { WeekViewMultiDayEventsRow } from "@/calendar/components/week-and-day-view/week-view-multi-day-events-row";
import { ResizableHourSidebar } from "@/calendar/components/week-and-day-view/resizable-hour-sidebar";

import { cn } from "@/lib/utils";
import { groupEvents, getEventBlockStyle, isWorkingHour, getVisibleHours } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

const DAY_MIN_WIDTH_PX = 160;
const HOURS_WIDTH_PX = 72; // w-18

export function CalendarWeekView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate, workingHours, visibleHours, hourHeight } = useCalendar();

  const { hours, earliestEventHour, latestEventHour } = getVisibleHours(visibleHours, singleDayEvents);

  // Fallback hours if none are generated - use default working hours
  const displayHours = hours.length > 0 ? hours : Array.from({ length: 12 }, (_, i) => i + 7);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const gridMinWidth = HOURS_WIDTH_PX + DAY_MIN_WIDTH_PX * 7;

  return (
    <>
      <div className="flex flex-col items-center justify-center border-b py-4 text-sm text-muted-foreground sm:hidden">
        <p>Weekly view is not available on smaller devices.</p>
        <p>Please switch to daily or monthly view.</p>
      </div>

      <div className="hidden h-[736px] overflow-auto sm:block">
        <div style={{ minWidth: `max(100%, ${gridMinWidth}px)` }}>
          <div className="sticky top-0 z-20 bg-background">
            <WeekViewMultiDayEventsRow selectedDate={selectedDate} multiDayEvents={multiDayEvents} dayMinWidth={DAY_MIN_WIDTH_PX} />

            <div className="relative z-20 flex border-b">
              <div className="sticky left-0 z-30 w-18 shrink-0 bg-background" />
              <div className="grid flex-1 grid-cols-7 divide-x border-l">
                {weekDays.map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <span
                      key={index}
                      className={`py-2 text-center text-xs font-medium ${isToday ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                      style={{ minWidth: DAY_MIN_WIDTH_PX }}
                    >
                      {format(day, "EE")}{" "}
                      <span className={`ml-1 font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex">
            <div className="sticky left-0 z-10 shrink-0 bg-background">
              <ResizableHourSidebar displayHours={displayHours} view="week" />
            </div>

            <div className="relative flex-1 border-l">
              <div className="grid grid-cols-7 divide-x">
                {weekDays.map((day, dayIndex) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayEvents = singleDayEvents.filter(event => {
                    const eventStartDate = parseISO(event.startDate);
                    const eventEndDate = parseISO(event.endDate);
                    return isSameDay(eventStartDate, day) || isSameDay(eventEndDate, day);
                  });
                  const groupedEvents = groupEvents(dayEvents);

                  return (
                    <div
                      key={dayIndex}
                      className={`relative ${isToday ? "border-l-2 border-r-2 border-primary" : ""}`}
                      style={{ minWidth: DAY_MIN_WIDTH_PX }}
                    >
                      {displayHours.map((hour, index) => {
                        const isDisabled = !isWorkingHour(day, hour, workingHours);

                        return (
                          <div key={hour} className={cn("relative", isDisabled && "bg-calendar-disabled-hour")} style={{ height: `${hourHeight}px` }}>
                            {index !== 0 && <div className="pointer-events-none absolute inset-x-0 top-0 border-b"></div>}

                            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed"></div>
                          </div>
                        );
                      })}

                      {groupedEvents.map((group, groupIndex) =>
                        group.map(event => {
                          let style = getEventBlockStyle(event, day, groupIndex, groupedEvents.length, { from: earliestEventHour, to: latestEventHour });
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
                  );
                })}
              </div>

              <CalendarTimeline firstVisibleHour={earliestEventHour} lastVisibleHour={latestEventHour} selectedDate={selectedDate} view="week" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
