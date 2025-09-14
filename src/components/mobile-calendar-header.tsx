"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";

import { CategorySelect } from "@/calendar/components/header/category-select";
import { TodayButton } from "@/calendar/components/header/today-button";
import { DateNavigator } from "@/calendar/components/header/date-navigator";

import type { IEvent } from "@/calendar/interfaces";
import type { TCalendarView } from "@/calendar/types";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

export function MobileCalendarHeader({ view, events }: IProps) {
  const pathname = usePathname();
  const basePath = pathname.includes('/admin') ? '/admin/agenda' : pathname;
  
  return (
    <div className="flex flex-col gap-4 border-b p-4">
      <div className="flex items-center gap-3">
        <TodayButton />
        <DateNavigator view={view} events={events} />
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex w-full items-center gap-1.5">
          <div className="inline-flex first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none">
            <Button asChild aria-label="View by day" variant={view === "day" ? "default" : "outline"} className="rounded-r-none px-3 transition-all duration-300 ease-in-out">
              <Link href={`${basePath}?view=day`} className="flex items-center gap-2">
                <List strokeWidth={1.8} className="w-4 h-4" />
                <span className={`text-sm font-medium transition-all duration-300 ease-in-out ${
                  view === "day" 
                    ? "opacity-100 max-w-20 translate-x-0" 
                    : "opacity-0 max-w-0 -translate-x-2 overflow-hidden"
                }`}>
                  Day
                </span>
              </Link>
            </Button>

            <Button
              asChild
              aria-label="View by agenda"
              variant={view === "agenda" ? "default" : "outline"}
              className="-ml-px rounded-l-none px-3 transition-all duration-300 ease-in-out"
            >
              <Link href={`${basePath}?view=agenda`} className="flex items-center gap-2">
                <CalendarRange strokeWidth={1.8} className="w-4 h-4" />
                <span className={`text-sm font-medium transition-all duration-300 ease-in-out ${
                  view === "agenda" 
                    ? "opacity-100 max-w-20 translate-x-0" 
                    : "opacity-0 max-w-0 -translate-x-2 overflow-hidden"
                }`}>
                  Agenda
                </span>
              </Link>
            </Button>
          </div>

          <CategorySelect />
        </div>
      </div>
    </div>
  );
}
