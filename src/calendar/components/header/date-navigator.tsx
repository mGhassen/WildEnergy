"use client";

import { useMemo, useState } from "react";
import { formatDate } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { getEventsCount, navigateDate, rangeText } from "@/calendar/helpers";

import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

export function DateNavigator({ view, events }: IProps) {
  const { selectedDate, setSelectedDate } = useCalendar();
  const [open, setOpen] = useState(false);

  const month = formatDate(selectedDate, "MMMM");
  const year = selectedDate.getFullYear();

  const eventCount = useMemo(() => getEventsCount(events, selectedDate, view), [events, selectedDate, view]);

  const handlePrevious = () => setSelectedDate(navigateDate(selectedDate, view, "previous"));
  const handleNext = () => setSelectedDate(navigateDate(selectedDate, view, "next"));

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setOpen(false);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-foreground">
          {month} {year}
        </span>
        <Badge variant="outline" className="px-1.5">
          {eventCount} events
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={handlePrevious}>
          <ChevronLeft />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-md px-1.5 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Choose date"
            >
              {rangeText(view, selectedDate)}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              captionLayout="dropdown"
              fromYear={2020}
              toYear={2035}
              defaultMonth={selectedDate}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" className="size-6.5 px-0 [&_svg]:size-4.5" onClick={handleNext}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
