import { cn } from "@/lib/utils";

interface BlacklistRibbonProps {
  className?: string;
}

export function BlacklistRibbon({ className }: BlacklistRibbonProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-0 top-0 z-10 h-20 w-20 overflow-hidden",
        className
      )}
      aria-label="Blacklisted"
    >
      <div className="absolute top-3 -right-8 w-28 rotate-45 bg-black py-1 text-center text-[10px] font-semibold tracking-wider text-white shadow">
        BLACKLIST
      </div>
    </div>
  );
}
