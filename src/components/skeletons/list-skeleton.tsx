import { Skeleton } from "@/components/ui/skeleton"

interface ListSkeletonProps {
  items?: number
  showAvatar?: boolean
  showActions?: boolean
}

export function ListSkeleton({ 
  items = 5, 
  showAvatar = false, 
  showActions = true 
}: ListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full" />
          )}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
