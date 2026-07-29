"use client";

import { useRouter } from "next/navigation";
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
import { useCreateSubscription } from "@/hooks/useSubscriptions";
import { useMembers } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { calculateSubscriptionEndDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { FormSkeleton } from "@/components/skeletons";

const subscriptionFormSchema = z.object({
  memberId: z.string().min(1, "Member is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  notes: z.string().optional(),
  status: z.enum(["active", "pending", "expired", "cancelled"]).optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

const CLOSE_HREF = "/admin/subscriptions";

export default function AdminNewSubscriptionPage() {
  const router = useRouter();
  const close = useCloseHref(CLOSE_HREF);
  const { toast } = useToast();
  const createSubscriptionMutation = useCreateSubscription();
  const { data: members = [], isLoading: loadingMembers } = useMembers();
  const { data: plans = [], isLoading: loadingPlans } = usePlans();

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
        sessionsIncluded:
          plan.plan_groups?.reduce(
            (sum: number, group: any) => sum + (group.session_count || 0),
            0,
          ) ?? 0,
        duration: plan.duration_days ?? plan.duration ?? 0,
        isActive: plan.is_active ?? plan.isActive ?? true,
      }))
    : [];

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      memberId: "",
      planId: "",
      startDate: new Date().toISOString().split("T")[0],
      notes: "",
      status: "pending",
    },
  });

  const handleSubmit = (data: SubscriptionFormData) => {
    const selectedPlan = mappedPlans.find(
      (plan) => plan.id === parseInt(data.planId),
    );
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Selected plan not found",
        variant: "destructive",
      });
      return;
    }

    const endDateStr = calculateSubscriptionEndDate(
      data.startDate,
      Number(selectedPlan.duration),
    );

    createSubscriptionMutation.mutate(
      {
        member_id: data.memberId,
        plan_id: parseInt(data.planId),
        start_date: data.startDate,
        end_date: endDateStr,
        notes: data.notes,
        status: data.status || "pending",
      },
      {
        onSuccess: () => {
          router.push(CLOSE_HREF);
        },
      },
    );
  };

  if (loadingMembers || loadingPlans) {
    return (
      <RouteDialog
        title="Add New Subscription"
        description="Create a new subscription for a member"
        closeHref={CLOSE_HREF}
        className="sm:max-w-2xl"
      >
        <FormSkeleton fields={5} />
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Add New Subscription"
      description="Create a new subscription for a member"
      closeHref={CLOSE_HREF}
      className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">Payment Information</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Payment information will be managed separately after creating
                the subscription.
              </p>
              <p>
                You can add payments using the credit card icon in the
                subscriptions list.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t">
              <h5 className="font-semibold text-xs mb-1">Payment Workflow:</h5>
              <ol className="text-xs text-muted-foreground space-y-1">
                <li>1. Create subscription (this step)</li>
                <li>2. Add payment via the payment button</li>
                <li>3. Track payment history in subscription details</li>
              </ol>
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
                                {plan.plan_groups &&
                                  plan.plan_groups.length > 0 && (
                                    <span>
                                      {" "}
                                      • {plan.plan_groups.length} group
                                      {plan.plan_groups.length > 1 ? "s" : ""}
                                    </span>
                                  )}
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
                  {plan.plan_groups && plan.plan_groups.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Included Groups:
                      </div>
                      <div className="space-y-1">
                        {plan.plan_groups.map((group: any) => (
                          <div
                            key={group.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  group.groups?.color || "#6B7280",
                              }}
                            />
                            <span className="font-medium">
                              {group.groups?.name}
                            </span>
                            <span className="text-muted-foreground">
                              ({group.session_count} session
                              {group.session_count > 1 ? "s" : ""}
                              {group.is_free && " • FREE"})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
              disabled={createSubscriptionMutation.isPending}
            >
              {createSubscriptionMutation.isPending
                ? "Creating..."
                : "Create Subscription"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </RouteDialog>
  );
}
