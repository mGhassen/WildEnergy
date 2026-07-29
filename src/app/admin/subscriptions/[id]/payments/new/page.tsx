"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscription } from "@/hooks/useSubscriptions";
import { useCreatePayment, usePayments } from "@/hooks/usePayments";
import { FormSkeleton } from "@/components/skeletons";

const paymentFormSchema = z.object({
  subscription_id: z.number(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_type: z.enum([
    "credit",
    "cash",
    "card",
    "bank_transfer",
    "check",
    "other",
  ]),
  status: z
    .enum(["pending", "paid", "failed", "cancelled", "refunded"])
    .optional(),
  payment_date: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  payment_reference: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

export default function AdminNewSubscriptionPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = Number(params.id);
  const closeHref =
    Number.isFinite(subscriptionId) && subscriptionId > 0
      ? `/admin/subscriptions/${subscriptionId}`
      : "/admin/subscriptions";
  const close = useCloseHref(closeHref);

  const { data: subscription, isLoading, isError } =
    useSubscription(subscriptionId);
  const { data: payments = [] } = usePayments();
  const createPaymentMutation = useCreatePayment();

  const remainingAmount = useMemo(() => {
    if (!subscription) return 0;
    const subscriptionPayments = payments.filter(
      (p) => p.subscription_id === subscriptionId,
    );
    const totalPaid = subscriptionPayments
      .filter((p) => p.payment_status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const planPrice = Number((subscription as any).plan?.price) || 0;
    return Math.max(0, planPrice - totalPaid);
  }, [subscription, payments, subscriptionId]);

  const member = (subscription as any)?.member;
  const memberCredit = Number(member?.credit) || 0;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    values: {
      subscription_id: Number.isFinite(subscriptionId) ? subscriptionId : 0,
      amount: remainingAmount > 0 ? remainingAmount : 0,
      payment_type: "cash",
      status: "paid",
      payment_date: new Date().toISOString().split("T")[0],
      payment_reference: "",
    },
  });

  const handleSubmit = (data: PaymentFormData) => {
    if (!subscription) return;
    createPaymentMutation.mutate(
      {
        subscription_id: data.subscription_id,
        member_id: subscription.member_id || "",
        amount: data.amount,
        payment_type: data.payment_type,
        payment_status: data.status,
        payment_date: data.payment_date,
        payment_reference: data.payment_reference,
      },
      {
        onSuccess: () => {
          router.push(closeHref);
        },
      },
    );
  };

  const useCredit = () => {
    const useAmount = Math.min(memberCredit, remainingAmount);
    form.setValue("amount", useAmount);
    form.setValue("payment_type", "credit");
  };

  if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
    return (
      <RouteDialog
        title="Add Payment"
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
        title="Add Payment"
        description="Loading…"
        closeHref={closeHref}
        className="sm:max-w-2xl"
      >
        <FormSkeleton fields={5} />
      </RouteDialog>
    );
  }

  if (isError || !subscription) {
    return (
      <RouteDialog
        title="Add Payment"
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
      title="Add Payment"
      description="Record a payment for this subscription"
      closeHref={closeHref}
      className="sm:max-w-2xl"
    >
      {member && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-green-700 font-semibold text-lg">
            Credit: {memberCredit} TND
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={useCredit}
            disabled={memberCredit <= 0 || remainingAmount <= 0}
          >
            Use Credit
          </Button>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              name="amount"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="payment_type"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      field.onBlur();
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {memberCredit > 0 && (
                        <SelectItem value="credit">Credit</SelectItem>
                      )}
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
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
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="payment_date"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Controller
              name="payment_reference"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Payment reference..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending
                ? "Creating..."
                : "Create Payment"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </RouteDialog>
  );
}
