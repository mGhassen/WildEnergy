import { cn } from "@/lib/utils";

const sizeConfig = {
  sm: {
    wrap: "h-[68px] w-[68px]",
    band: "top-[16px] -right-[26px] w-[104px] py-[3px] text-[9px] tracking-[0.12em]",
  },
  md: {
    wrap: "h-24 w-24",
    band: "top-[22px] -right-[34px] w-[136px] py-1 text-[10px] tracking-[0.14em]",
  },
  lg: {
    wrap: "h-36 w-36",
    band: "top-[34px] -right-[42px] w-[180px] py-1.5 text-xs tracking-[0.16em]",
  },
} as const;

interface BlacklistRibbonProps {
  size?: keyof typeof sizeConfig;
  className?: string;
}

export function BlacklistRibbon({ size = "md", className }: BlacklistRibbonProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-0 top-0 z-20 overflow-hidden",
        config.wrap,
        className
      )}
      aria-label="Blacklisted"
    >
      <div
        className={cn(
          "absolute rotate-45 bg-black text-center font-bold text-white shadow-md",
          config.band
        )}
      >
        BLACKLIST
      </div>
    </div>
  );
}
