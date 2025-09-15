"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Users, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/config";
import { useMemberPlans } from "@/hooks/useMemberPlans";
import { CardSkeleton } from "@/components/skeletons";
import { useState } from "react";

export default function PlansPage() {
  const { data: plans, isLoading: plansLoading } = useMemberPlans();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Helper function to get total sessions from plan groups
  const getTotalSessions = (plan: any) => {
    if (plan.plan_groups && plan.plan_groups.length > 0) {
      return plan.plan_groups.reduce((total: number, group: any) => total + group.session_count, 0);
    }
    return 0;
  };

  // Find the plan with the most sessions for 'Popular' badge
  const maxSessions = Math.max(...(plans?.map(p => getTotalSessions(p)) || [0]));

  // Helper function to get categories from a group
  const getGroupCategories = (group: any) => {
    if (!group.groups?.group_categories) return [];
    return group.groups.group_categories.map((gc: any) => gc.categories);
  };

  // Toggle group expansion
  const toggleGroup = (planId: number, groupIndex: number) => {
    const groupKey = `${planId}-${groupIndex}`;
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Our Membership Plans</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
            Choose the plan that fits your goals. Flexible options, great value, and all the features you need to succeed!
          </p>
        </div>
        
        {plansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} showImage={false} lines={6} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans?.map((plan) => (
              <Card key={plan.id} className="h-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{plan.name}</h3>
                    {getTotalSessions(plan) === maxSessions && getTotalSessions(plan) > 0 && (
                      <Badge className="bg-primary text-white text-xs flex-shrink-0">Popular</Badge>
                    )}
                  </div>
                  <p className="mb-3 text-sm sm:text-base text-muted-foreground line-clamp-2">{plan.description}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                    <span className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(plan.price)}</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/ {plan.duration_days} days</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm bg-muted px-2 py-1 rounded-full">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> {getTotalSessions(plan)} total sessions
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm bg-muted px-2 py-1 rounded-full">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> {plan.duration_days} days
                      </span>
                    </div>
                    
                    {/* Plan Groups Display */}
                    {plan.plan_groups && plan.plan_groups.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Includes:</p>
                        <div className="space-y-2">
                          {plan.plan_groups.map((group: any, index: number) => {
                            const categories = getGroupCategories(group);
                            const groupKey = `${plan.id}-${index}`;
                            const isExpanded = expandedGroups.has(groupKey);
                            
                            return (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <div 
                                    className="flex items-center gap-2 min-w-0 cursor-pointer hover:bg-muted/50 rounded-md p-1 -m-1 transition-colors"
                                    onClick={() => toggleGroup(plan.id, index)}
                                  >
                                    <div 
                                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                                      style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                                    />
                                    <span className="font-medium truncate">{group.groups?.name}</span>
                                    {categories.length > 0 && (
                                      <div className="flex items-center ml-1">
                                        {isExpanded ? (
                                          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground text-xs sm:text-sm flex-shrink-0 ml-2">{group.session_count} sessions</span>
                                </div>
                                {categories.length > 0 && isExpanded && (
                                  <div className="ml-4 sm:ml-5 text-xs text-muted-foreground animate-in slide-in-from-top-1 duration-200">
                                    {categories.map((cat: any, catIndex: number) => (
                                      <span key={catIndex}>
                                        {cat.name}
                                        {catIndex < categories.length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs sm:text-sm bg-muted px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" /> All classes included
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-auto">
                    <Button
                      asChild
                      className="w-full text-sm sm:text-base font-semibold"
                      variant="outline"
                    >
                      <a href={`mailto:info@gym.com?subject=Interested in ${encodeURIComponent(plan.name)} plan`}>Contact Us</a>
                    </Button>
                    <div className="text-xs text-muted-foreground text-center">
                      No payment required online. Contact us to activate your membership!
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <div className="mt-12 text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Why Choose Us?</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm sm:text-base lg:text-lg">
            <li className="flex items-center justify-center gap-2"><Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> Top-rated trainers</li>
            <li className="flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" /> Flexible schedules</li>
            <li className="flex items-center justify-center gap-2"><Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Friendly community</li>
            <li className="flex items-center justify-center gap-2"><Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Modern facilities</li>
          </ul>
        </div>
      </div>
  );
} 