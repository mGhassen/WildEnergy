"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Users, CheckCircle, Grid3X3, List } from "lucide-react";
import { formatCurrency } from "@/lib/config";
import MemberLayout from "@/components/layout/member-layout";
import { useMemberPlans } from "@/hooks/useMemberPlans";
import { CardSkeleton } from "@/components/skeletons";
import { useState } from "react";

export default function PlansPage() {
  const { data: plans, isLoading: plansLoading } = useMemberPlans();
  const [viewType, setViewType] = useState<'cards' | 'list'>('cards');

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
        <p className="text-lg text-muted-foreground text-center mb-6">
          Choose the plan that fits your goals. Flexible options, great value, and all the features you need to succeed!
        </p>
        
        {/* View Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={viewType === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('cards')}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              Cards
            </Button>
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
              className="flex items-center gap-2"
            >
              <List className="w-4 h-4" />
              List
            </Button>
          </div>
        </div>
        {plansLoading ? (
          viewType === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} showImage={false} lines={6} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-8 bg-muted rounded w-24"></div>
                      <div className="h-8 bg-muted rounded w-32"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : viewType === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans?.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    {getTotalSessions(plan) === maxSessions && getTotalSessions(plan) > 0 && (
                      <Badge className="bg-primary text-white ml-2">Popular</Badge>
                    )}
                  </div>
                  <p className="mb-3 text-base text-muted-foreground">{plan.description}</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl font-bold text-primary">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">/ {plan.duration_days} days</span>
                  </div>
                  <div className="space-y-3 mb-4">
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
                  
                  <div className="flex flex-col gap-4">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {plans?.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {getTotalSessions(plan) === maxSessions && getTotalSessions(plan) > 0 && (
                        <Badge className="bg-primary text-white">Popular</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{formatCurrency(plan.price)}</div>
                        <div className="text-sm text-muted-foreground">/ {plan.duration_days} days</div>
                      </div>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a href={`mailto:info@gym.com?subject=Interested in ${encodeURIComponent(plan.name)} plan`}>Contact Us</a>
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-primary" />
                      <span>{getTotalSessions(plan)} total sessions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{plan.duration_days} days</span>
                    </div>
                  </div>
                  
                  {/* Plan Groups Display */}
                  {plan.plan_groups && plan.plan_groups.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Includes:</p>
                      <div className="flex flex-wrap gap-4">
                        {plan.plan_groups.map((group: any, index: number) => {
                          const categories = getGroupCategories(group);
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                              />
                              <span className="text-sm font-medium">{group.groups?.name}</span>
                              <span className="text-sm text-muted-foreground">({group.session_count} sessions)</span>
                              {categories.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  - {categories.map((cat: any) => cat.name).join(', ')}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>All classes included</span>
                    </div>
                  )}
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