"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Users, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import MemberLayout from "@/components/layout/member-layout";

export default function PlansPage() {
  const { data: plans, isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["/api/plans"],
    queryFn: () => apiRequest("GET", "/api/plans"),
  });

  // Find the plan with the most sessions for 'Popular' badge
  const maxSessions = Math.max(...(plans?.map(p => p.max_sessions) || [0]));

  return (
    <MemberLayout>
      <div className="max-w-5xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-center mb-2">Our Membership Plans</h1>
        <p className="text-lg text-muted-foreground text-center mb-10">
          Choose the plan that fits your goals. Flexible options, great value, and all the features you need to succeed!
        </p>
        {plansLoading ? (
          <div className="text-center">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans?.map((plan) => (
              <Card
                key={plan.id}
                className="flex flex-col justify-between shadow-lg border border-border/60 hover:border-primary transition-all hover:scale-[1.025]"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                    {plan.max_sessions === maxSessions && (
                      <Badge className="bg-primary text-white ml-2">Popular</Badge>
                    )}
                  </div>
                  <CardDescription className="mb-2 text-base">{plan.description}</CardDescription>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl font-bold text-primary">{plan.price} TND</span>
                    <span className="text-muted-foreground">/ {plan.duration_days} days</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full">
                      <Users className="w-4 h-4 text-primary" /> {plan.max_sessions} sessions
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full">
                      <Calendar className="w-4 h-4 text-primary" /> {plan.duration_days} days
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" /> All classes included
                    </span>
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