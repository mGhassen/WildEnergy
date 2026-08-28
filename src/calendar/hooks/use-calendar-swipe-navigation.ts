"use client";

import { useEffect, useRef } from "react";

import { useCalendar } from "@/calendar/contexts/calendar-context";
import { navigateDate } from "@/calendar/helpers";

import type { TCalendarView } from "@/calendar/types";

const SWIPE_THRESHOLD = 60;
const NAVIGATION_COOLDOWN_MS = 350;
const GESTURE_RESET_MS = 150;

export function useCalendarSwipeNavigation(view: TCalendarView) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedDate, setSelectedDate } = useCalendar();

  const selectedDateRef = useRef(selectedDate);
  const viewRef = useRef(view);
  const accumulatedDeltaRef = useRef(0);
  const lastNavigationAtRef = useRef(0);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  selectedDateRef.current = selectedDate;
  viewRef.current = view;

  useEffect(() => {
    accumulatedDeltaRef.current = 0;
  }, [view]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clearResetTimer = () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };

    const scheduleReset = () => {
      clearResetTimer();
      resetTimerRef.current = setTimeout(() => {
        accumulatedDeltaRef.current = 0;
      }, GESTURE_RESET_MS);
    };

    const navigate = (direction: "previous" | "next") => {
      const now = Date.now();
      if (now - lastNavigationAtRef.current < NAVIGATION_COOLDOWN_MS) return;

      setSelectedDate(navigateDate(selectedDateRef.current, viewRef.current, direction));
      accumulatedDeltaRef.current = 0;
      lastNavigationAtRef.current = now;
      clearResetTimer();
    };

    const onWheel = (event: WheelEvent) => {
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);

      if (absX <= absY || absX < 4) return;

      event.preventDefault();

      accumulatedDeltaRef.current += event.deltaX;
      scheduleReset();

      if (Math.abs(accumulatedDeltaRef.current) < SWIPE_THRESHOLD) return;

      navigate(accumulatedDeltaRef.current > 0 ? "next" : "previous");
    };

    let touchStartX: number | null = null;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartX === null || event.changedTouches.length !== 1) return;

      const deltaX = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;

      if (Math.abs(deltaX) < 80) return;

      event.preventDefault();
      navigate(deltaX < 0 ? "next" : "previous");
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      clearResetTimer();
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [setSelectedDate, view]);

  return containerRef;
}
