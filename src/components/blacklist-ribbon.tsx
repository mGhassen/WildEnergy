import { cn } from "@/lib/utils";

const sizeConfig = {
  sm: {
    wrap: "h-[68px] w-[68px]",
    rightBand: "top-[16px] -right-[26px] w-[104px] py-[3px] text-[9px] tracking-[0.12em]",
    leftBand: "top-[16px] -left-[26px] w-[104px] py-[3px] text-[9px] tracking-[0.12em]",
  },
  md: {
    wrap: "h-24 w-24",
    rightBand: "top-[22px] -right-[34px] w-[136px] py-1 text-[10px] tracking-[0.14em]",
    leftBand: "top-[22px] -left-[34px] w-[136px] py-1 text-[10px] tracking-[0.14em]",
  },
  lg: {
    wrap: "h-36 w-36",
    rightBand: "top-[34px] -right-[42px] w-[180px] py-1.5 text-xs tracking-[0.16em]",
    leftBand: "top-[34px] -left-[42px] w-[180px] py-1.5 text-xs tracking-[0.16em]",
  },
} as const;

interface BlacklistRibbonProps {
  size?: keyof typeof sizeConfig;
  side?: "left" | "right";
  className?: string;
}

export function BlacklistRibbon({
  size = "md",
  side = "right",
  className,
}: BlacklistRibbonProps) {
  const config = sizeConfig[size];
  const isLeft = side === "left";

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 z-20 overflow-hidden",
        isLeft ? "left-0" : "right-0",
        config.wrap,
        className
      )}
      aria-label="Blacklisted"
    >
      <div
        className={cn(
          "absolute bg-black text-center font-bold text-white shadow-md",
          isLeft ? "-rotate-45" : "rotate-45",
          isLeft ? config.leftBand : config.rightBand
        )}
      >
        BLACKLIST
      </div>
    </div>
  );
}
