"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { EventDetailsDialog } from './dialogs/event-details-dialog';
import { useCalendar } from '../contexts/calendar-context';
import type { IEvent } from '../interfaces';

interface EventWrapperProps {
  event: IEvent;
  children: React.ReactNode;
}

export function EventWrapper({ event, children }: EventWrapperProps) {
  const router = useRouter();
  const { eventMode = 'dialog', eventBasePath = '/admin/courses' } = useCalendar();

  const handleEventClick = () => {
    if (eventMode === 'navigation') {
      // Navigate to course detail page
      router.push(`${eventBasePath}/${event.id}`);
    }
    // If mode is 'dialog', the EventDetailsDialog will handle the click
  };

  if (eventMode === 'navigation') {
    return (
      <div 
        role="button" 
        tabIndex={0}
        onClick={handleEventClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEventClick();
          }
        }}
        className="cursor-pointer"
      >
        {children}
      </div>
    );
  }

  // Default dialog mode
  return (
    <EventDetailsDialog event={event}>
      {children}
    </EventDetailsDialog>
  );
}
