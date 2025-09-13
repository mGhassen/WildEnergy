"use client";

import { createContext, useContext, useState, useEffect } from "react";

import type { Dispatch, SetStateAction } from "react";
import type { IEvent, IUser } from "@/calendar/interfaces";
import type { TBadgeVariant, TVisibleHours, TWorkingHours } from "@/calendar/types";

interface ICalendarContext {
  selectedDate: Date;
  setSelectedDate: (date: Date | undefined) => void;
  selectedCategoryId: number | "all";
  setSelectedCategoryId: (categoryId: number | "all") => void;
  badgeVariant: TBadgeVariant;
  setBadgeVariant: (variant: TBadgeVariant) => void;
  users: IUser[];
  workingHours: TWorkingHours;
  setWorkingHours: Dispatch<SetStateAction<TWorkingHours>>;
  visibleHours: TVisibleHours;
  setVisibleHours: Dispatch<SetStateAction<TVisibleHours>>;
  hourHeight: number;
  setHourHeight: Dispatch<SetStateAction<number>>;
  events: IEvent[];
  setLocalEvents: Dispatch<SetStateAction<IEvent[]>>;
  registrations: any[];
  eventMode?: 'dialog' | 'navigation';
  eventBasePath?: string;
}

const CalendarContext = createContext({} as ICalendarContext);

const WORKING_HOURS = {
  0: { from: 0, to: 0 },
  1: { from: 8, to: 17 },
  2: { from: 8, to: 17 },
  3: { from: 8, to: 17 },
  4: { from: 8, to: 17 },
  5: { from: 8, to: 17 },
  6: { from: 8, to: 12 },
};

const VISIBLE_HOURS = { from: 0, to: 24 };
const DEFAULT_HOUR_HEIGHT = 48;

export function CalendarProvider({ 
  children, 
  users, 
  events, 
  registrations = [], 
  eventMode = 'dialog', 
  eventBasePath = '/admin/courses' 
}: { 
  children: React.ReactNode; 
  users: IUser[]; 
  events: IEvent[]; 
  registrations?: any[];
  eventMode?: 'dialog' | 'navigation';
  eventBasePath?: string;
}) {
  const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>("colored");
  const [visibleHours, setVisibleHours] = useState<TVisibleHours>(VISIBLE_HOURS);
  const [workingHours, setWorkingHours] = useState<TWorkingHours>(WORKING_HOURS);
  
  // Load hour height from localStorage or use default
  const [hourHeight, setHourHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar-hour-height');
      if (saved) {
        const parsed = parseInt(saved, 10);
        // Validate the saved value is within valid range
        if (parsed >= 48 && parsed <= 200) {
          return parsed;
        }
      }
    }
    return DEFAULT_HOUR_HEIGHT;
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");

  // Use the events prop directly instead of local state
  const [localEvents, setLocalEvents] = useState<IEvent[]>(events);

  // Update localEvents when events prop changes
  useEffect(() => {
    console.log('=== CALENDAR CONTEXT EVENTS UPDATE ===');
    console.log('Events received:', events.length);
    console.log('Visible hours:', visibleHours);
    setLocalEvents(events);
  }, [events]);

  // Save hour height to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-hour-height', hourHeight.toString());
    }
  }, [hourHeight]);

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
  };

  return (
    <CalendarContext.Provider
      value={{
        selectedDate,
        setSelectedDate: handleSelectDate,
        selectedCategoryId,
        setSelectedCategoryId,
        badgeVariant,
        setBadgeVariant,
        users,
        visibleHours,
        setVisibleHours,
        workingHours,
        setWorkingHours,
        hourHeight,
        setHourHeight,
        // If you go to the refetch approach, you can remove the localEvents and pass the events directly
        events: localEvents,
        setLocalEvents,
        registrations,
        eventMode,
        eventBasePath,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar(): ICalendarContext {
  const context = useContext(CalendarContext);
  if (!context) throw new Error("useCalendar must be used within a CalendarProvider.");
  return context;
}
