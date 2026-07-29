"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react";
import { usePlan } from "@/hooks/usePlans";
import { formatCurrency } from "@/lib/config";
import { DashboardSkeleton } from "@/components/skeletons";

export default function AdminPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);
  const { data: plan, isLoading, error } = usePlan(planId);

  const getDurationText = (days: number) => {
    if (days === 30) return "Monthly";
    if (days === 365) return "Yearly";
    if (days === 90) return "Quarterly";
    if (days === 180) return "Semi-Annual";
    return `${days} days`;
  };

  if (!Number.isFinite(planId) || planId <= 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/plans")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Plans
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Invalid plan</CardTitle>
            <CardDescription>
              The plan ID in this URL is not valid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  if (error || !plan) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/plans")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Plans
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Plan not found</CardTitle>
            <CardDescription>
              This plan may have been deleted or the link is invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isActive = plan.is_active;
  const totalSessions =
    plan.plan_groups?.reduce((t, g) => t + (g.session_count ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/plans")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{plan.name}</h1>
            <p className="text-muted-foreground">
              {plan.description || "Membership plan details"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/plans/${plan.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive"
            onClick={() => router.push(`/admin/plans/${plan.id}/delete`)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Price</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              {formatCurrency(Number(plan.price))}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Duration</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock className="w-5 h-5 text-muted-foreground" />
              {getDurationText(plan.duration_days)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sessions</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              {totalSessions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl">
              <Badge
                variant={isActive ? "default" : "secondary"}
                className={
                  isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : ""
                }
              >
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Included Groups
          </CardTitle>
          <CardDescription>
            Session allowances included in this plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {plan.plan_groups && plan.plan_groups.length > 0 ? (
            plan.plan_groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor: group.groups?.color || "#6B7280",
                    }}
                  />
                  <div>
                    <div className="font-medium">
                      {group.groups?.name || "Unknown Group"}
                    </div>
                    {group.groups?.description && (
                      <div className="text-sm text-muted-foreground">
                        {group.groups.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {group.session_count} sessions
                  </span>
                  {group.is_free && (
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      FREE
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No groups included</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
