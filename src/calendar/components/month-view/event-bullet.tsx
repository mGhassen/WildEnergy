import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { TEventColor } from "@/calendar/types";

const eventBulletVariants = cva("size-2 rounded-full", {
  variants: {
    color: {
      blue: "bg-blue-600 dark:bg-blue-500",
      green: "bg-green-600 dark:bg-green-500",
      red: "bg-red-600 dark:bg-red-500",
      yellow: "bg-yellow-600 dark:bg-yellow-500",
      purple: "bg-purple-600 dark:bg-purple-500",
      gray: "bg-neutral-600 dark:bg-neutral-500",
      orange: "bg-orange-600 dark:bg-orange-500",
    },
  },
  defaultVariants: {
    color: "blue",
  },
});

export function EventBullet({ color, hexColor, className }: { color: TEventColor; hexColor?: string; className: string }) {
  if (hexColor) {
    return <div className={cn("size-2 rounded-full", className)} style={{ backgroundColor: hexColor }} />;
  }
  return <div className={cn(eventBulletVariants({ color, className }))} />;
}
