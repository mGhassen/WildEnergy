"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGuestCount, useIncrementGuestCount } from "@/hooks/useGuestCount";
import { UserPlus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface GuestCountBadgeProps {
  memberId: string;
  memberName: string;
  showIncrementButton?: boolean;
  className?: string;
}

export function GuestCountBadge({ 
  memberId, 
  memberName, 
  showIncrementButton = false,
  className = ""
}: GuestCountBadgeProps) {
  const { data: guestCountData, isLoading } = useGuestCount(memberId);
  const incrementGuestCount = useIncrementGuestCount();
  const { toast } = useToast();
  const [isIncrementing, setIsIncrementing] = useState(false);

  const guestCount = guestCountData?.guest_count || 0;

  const handleIncrementGuest = async () => {
    if (isIncrementing) return;
    
    setIsIncrementing(true);
    try {
      await incrementGuestCount.mutateAsync(memberId);
      toast({
        title: "Guest count incremented",
        description: `${memberName} has been registered as a guest. Total guest count: ${guestCount + 1}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to increment guest count",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsIncrementing(false);
    }
  };

  if (isLoading) {
    return (
      <Badge variant="outline" className={className}>
        <Users className="w-3 h-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={guestCount > 0 ? "default" : "outline"} 
        className={className}
      >
        <Users className="w-3 h-3 mr-1" />
        {guestCount} guest{guestCount !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
}
