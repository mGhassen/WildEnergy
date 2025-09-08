"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Users, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/config";
import MemberLayout from "@/components/layout/member-layout";
import { useMemberPlans } from "@/hooks/useMemberPlans";
import { CardSkeleton } from "@/components/skeletons";

export default function PlansPage() {
  const { data: plans, isLoading: plansLoading } = useMemberPlans();

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

  return (
    <MemberLayout>
      <div className="max-w-5xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-center mb-2">Our Membership Plans</h1>
        <p className="text-lg text-muted-foreground text-center mb-10">
          Choose the plan that fits your goals. Flexible options, great value, and all the features you need to succeed!
        </p>
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} showImage={false} lines={6} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans?.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    {getTotalSessions(plan) === maxSessions && getTotalSessions(plan) > 0 && (
                      <Badge className="bg-primary text-white ml-2">Popular</Badge>
                    )}
                  </div>
                  <CardDescription className="mb-2 text-base">{plan.description}</CardDescription>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl font-bold text-primary">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">/ {plan.duration_days} days</span>
                  </div>
                  <div className="space-y-3 mt-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full">
                        <Users className="w-4 h-4 text-primary" /> {getTotalSessions(plan)} total sessions
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full">
                        <Calendar className="w-4 h-4 text-primary" /> {plan.duration_days} days
                      </span>
                    </div>
                    
                    {/* Plan Groups Display */}
                    {plan.plan_groups && plan.plan_groups.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Includes:</p>
                        <div className="space-y-2">
                          {plan.plan_groups.map((group: any, index: number) => {
                            const categories = getGroupCategories(group);
                            return (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                                    />
                                    <span className="font-medium">{group.groups?.name}</span>
                                  </div>
                                  <span className="text-muted-foreground">{group.session_count} sessions</span>
                                </div>
                                {categories.length > 0 && (
                                  <div className="ml-5 text-xs text-muted-foreground">
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
                      <span className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" /> All classes included
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 mt-2">
                  <Button
                    asChild
                    className="w-full text-base font-semibold"
                    variant="outline"
                  >
                    <a href={`mailto:info@gym.com?subject=Interested in ${encodeURIComponent(plan.name)} plan`}>Contact Us</a>
                  </Button>
                  <div className="text-xs text-muted-foreground text-center">
                    No payment required online. Contact us to activate your membership!
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Why Choose Us?</h2>
          <ul className="flex flex-wrap justify-center gap-6 text-lg mt-4">
            <li className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Top-rated trainers</li>
            <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" /> Flexible schedules</li>
            <li className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Friendly community</li>
            <li className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Modern facilities</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  );
} 