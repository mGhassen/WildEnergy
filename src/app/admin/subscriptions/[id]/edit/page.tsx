"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscription, useUpdateSubscription } from "@/hooks/useSubscriptions";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { formatCurrency } from "@/lib/config";
import { totalPlanSessionCount } from "@/lib/session-eligibility";
import { useToast } from "@/hooks/use-toast";
import { FormSkeleton } from "@/components/skeletons";

const subscriptionFormSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  endDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  notes: z.string().optional(),
  status: z.enum(["active", "pending", "expired", "cancelled"]).optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function AdminEditSubscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";
  const close = useCloseHref(closeHref);

  const { data: subscription, isLoading, isError } = useSubscription(subscriptionId);
  const updateSubscriptionMutation = useUpdateSubscription();
  const { data: members = [] } = useMembers();
  const { data: plans = [] } = usePlans();

  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || "",
        lastName: m.lastName || m.last_name || "",
        email: m.email || m.account_email || "",
        member_status: m.member_status,
      }))
    : [];

  const mappedPlans = Array.isArray(plans)
    ? plans.map((plan: any) => ({
        ...plan,
        sessionsIncluded: totalPlanSessionCount(plan),
        duration: plan.duration_days ?? plan.duration ?? 0,
        isActive: plan.is_active ?? plan.isActive ?? true,
      }))
    : [];

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      memberId: "",
      planId: "",
      startDate: "",
      endDate: "",
      notes: "",
      status: "pending",
    },
  });

  useEffect(() => {
    if (!subscription) return;
    form.reset({
      memberId: subscription.member_id,
      planId: String(subscription.plan_id),
      startDate: subscription.start_date?.split("T")[0] || "",
      endDate: subscription.end_date?.split("T")[0] || "",
      notes: subscription.notes || "",
      status: (subscription.status as SubscriptionFormData["status"]) || "pending",
    });
  }, [subscription, form]);

  const handleSubmit = (data: SubscriptionFormData) => {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    updateSubscriptionMutation.mutate(
      {
        subscriptionId,
        data: {
          member_id: data.memberId,
          plan_id: parseInt(data.planId),
          start_date: data.startDate,
          end_date: data.endDate,
          notes: data.notes,
          status: data.status || "pending",
        },
      },
      {
        onSuccess: () => {
          router.replace(closeHref);
        },
      },
    );
  };

  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
    return (
      <RouteDialog
        title="Edit Subscription"
        description="Invalid subscription"
        closeHref="/admin/subscriptions"
      >
        <p className="text-sm text-muted-foreground">
          This subscription link is invalid.
        </p>
      </RouteDialog>
    );
  }

  if (isLoading) {
    return (
      <RouteDialog
        title="Edit Subscription"
        description="Loading…"
        closeHref={closeHref}
        className="sm:max-w-2xl"
      >
        <FormSkeleton fields={6} />
      </RouteDialog>
    );
  }

  if (isError || !subscription) {
    return (
      <RouteDialog
        title="Edit Subscription"
        description="Subscription not found"
        closeHref="/admin/subscriptions"
      >
        <p className="text-sm text-muted-foreground">
          This subscription may have been deleted or the link is invalid.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Back
          </Button>
        </DialogFooter>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Subscription"
      description="Update subscription details"
      closeHref={closeHref}
      className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Payment Information</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Payment information is managed separately from subscription
                details.
              </p>
              <p>
                Use the credit card icon in the subscriptions list to add
                payments.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <Controller
              name="memberId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      field.onBlur();
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mappedMembers
                        .filter((member) => member.member_status === "active")
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="planId"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      field.onBlur();
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mappedPlans
                        .filter((plan) => plan.isActive !== false)
                        .map((plan) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            <div className="flex flex-col">
                              <div className="font-medium">
                                {plan.name} - {formatCurrency(Number(plan.price))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {plan.sessionsIncluded || 0} sessions •{" "}
                                {plan.duration || 0} days
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="startDate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="endDate"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      field.onBlur();
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(() => {
              const planId = form.watch("planId");
              if (!planId) {
                return (
                  <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                    Select a plan to see details.
                  </div>
                );
              }
              const plan = mappedPlans.find((p) => p.id === parseInt(planId));
              if (!plan) return null;
              return (
                <div className="text-sm text-muted-foreground border-t pt-2 mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      Sessions included: <b>{plan.sessionsIncluded || 0}</b>
                    </div>
                    <div>
                      Duration: <b>{plan.duration || 0} days</b>
                    </div>
                    <div>
                      Price: <b>{formatCurrency(Number(plan.price))}</b>
                    </div>
                    <div>
                      Groups: <b>{plan.plan_groups?.length || 0}</b>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateSubscriptionMutation.isPending}
            >
              {updateSubscriptionMutation.isPending
                ? "Updating..."
                : "Update Subscription"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </RouteDialog>
  );
}
