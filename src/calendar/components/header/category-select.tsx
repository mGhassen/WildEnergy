"use client";

import { useMemo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useCalendar } from "@/calendar/contexts/calendar-context";

export function CategorySelect() {
  const { selectedCategoryId, setSelectedCategoryId, events } = useCalendar();

  const categories = useMemo(() => {
    const categoryMap = new Map();
    
    events.forEach(event => {
      if (event.category) {
        categoryMap.set(event.category.id, {
          id: event.category.id,
          name: event.category.name,
          color: event.category.color
        });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  return (
    <Select value={selectedCategoryId.toString()} onValueChange={(value) => setSelectedCategoryId(value === "all" ? "all" : parseInt(value))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {categories.map(category => (
          <SelectItem key={category.id} value={category.id.toString()}>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
