import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
  showImage?: boolean
  showActions?: boolean
  lines?: number
}

export function CardSkeleton({ 
  showImage = false, 
  showActions = true, 
  lines = 3 
}: CardSkeletonProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      {showImage && (
        <Skeleton className="h-48 w-full mb-4" />
      )}
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        {showActions && (
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        )}
      </div>
    </div>
  )
}
