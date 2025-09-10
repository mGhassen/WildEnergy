"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"

export function MemberUserSkeleton() {
  return (
    <div className="hidden lg:flex items-center space-x-3">
      <Button variant="ghost" className="flex items-center space-x-3 p-2 pointer-events-none">
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-muted">
            <Skeleton className="h-4 w-4 rounded" />
          </AvatarFallback>
        </Avatar>
        <div className="text-left">
          <Skeleton className="h-4 w-24 mb-1" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
