"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { format } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

import { cn } from "@/lib/utils";

interface IProps {
  displayHours: number[];
  view: 'day' | 'week';
}

export function ResizableHourSidebar({ displayHours, view }: IProps) {
  const { hourHeight, setHourHeight } = useCalendar();
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = hourHeight;
  }, [hourHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    e.preventDefault();
    const deltaY = e.clientY - startYRef.current;
    const sensitivity = 0.5;
    const newHeight = Math.max(48, Math.min(200, startHeightRef.current + deltaY * sensitivity));
    
    setHourHeight(Math.round(newHeight));
  }, [isResizing, setHourHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setIsHovering(false);
    // The height is automatically saved to localStorage via the context useEffect
  }, []);

  // Add global event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isResizing) {
      setIsHovering(false);
    }
  }, [isResizing]);

  return (
    <div 
      ref={sidebarRef}
      className={cn(
        "relative w-18 transition-all duration-200",
        isHovering && "bg-muted/30",
        isResizing && "bg-muted/50"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Resize handle - covers the entire sidebar */}
      <div
        className="absolute inset-0 cursor-ns-resize z-10 hover:bg-primary/5"
        onMouseDown={handleMouseDown}
        title="Drag to resize hour height"
        style={{ 
          background: isResizing ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          border: isResizing ? '1px solid rgba(59, 130, 246, 0.3)' : 'none'
        }}
      />
      
      {/* Hour labels */}
      {displayHours.map((hour, index) => (
        <div key={hour} className="relative" style={{ height: `${hourHeight}px` }}>
          <div className="absolute -top-3 right-2 flex h-6 items-center">
            <span className="text-xs text-muted-foreground">
              {format(new Date().setHours(hour, 0, 0, 0), "HH:mm")}
            </span>
          </div>
        </div>
      ))}
      
      {/* Visual resize indicator */}
      {isHovering && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary/30 pointer-events-none" />
      )}
      
      {isResizing && (
        <>
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary pointer-events-none" />
          <div className="absolute right-2 top-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium pointer-events-none z-20">
            {hourHeight}px
          </div>
        </>
      )}
      
      {/* Always visible resize hint */}
      <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-border/50 pointer-events-none" />
    </div>
  );
}
