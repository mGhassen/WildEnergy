import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-4">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="mt-2 h-2.5 w-2.5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-1 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
