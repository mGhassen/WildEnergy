import { formatDate } from "date-fns";

import { useCalendar } from "@/calendar/contexts/calendar-context";

export function TodayButton() {
  const { selectedDate, setSelectedDate } = useCalendar();

  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const handleClick = () => setSelectedDate(today);

  return (
    <button
      className={`flex size-14 flex-col items-start overflow-hidden rounded-lg border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        isToday ? 'border-primary shadow-md' : ''
      }`}
      onClick={handleClick}
    >
      <p className={`flex h-6 w-full items-center justify-center text-center text-xs font-semibold ${
        isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {formatDate(today, "MMM").toUpperCase()}
      </p>
      <p className={`flex w-full items-center justify-center text-lg font-bold ${
        isToday ? 'text-primary' : 'text-foreground'
      }`}>
        {today.getDate()}
      </p>
    </button>
  );
}
