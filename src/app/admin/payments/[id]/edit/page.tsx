"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import { usePayment, usePayments, useUpdatePayment } from "@/hooks/usePayments";
import { Suspense } from "react";

function safeFrom(from: string | null, fallback: string) {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : fallback;
}

function EditPaymentContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = Number(params.id);

  const { data: paymentById, isLoading: isLoadingOne, isError } =
    usePayment(paymentId);
  const { data: payments = [], isLoading: isLoadingList } = usePayments();
  const payment =
    paymentById ??
    payments.find((p) => Number(p.id) === paymentId) ??
    undefined;
  const isLoading = (isLoadingOne || isLoadingList) && !payment;

  const defaultClose = useMemo(() => {
    const subId = payment?.subscription_id;
    if (subId) return `/admin/subscriptions/${subId}`;
    return "/admin/payments";
  }, [payment?.subscription_id]);

  const closeHref = safeFrom(searchParams.get("from"), defaultClose);
  const close = useCloseHref(closeHref);
  const updatePaymentMutation = useUpdatePayment();

  const [formData, setFormData] = useState({
    amount: "",
    payment_type: "cash",
    payment_status: "paid",
    payment_date: "",
    transaction_id: "",
    notes: "",
  });

  useEffect(() => {
    if (!payment) return;
    const p = payment as typeof payment & {
      transaction_id?: string;
      notes?: string;
    };
    setFormData({
      amount: payment.amount.toString(),
      payment_type: payment.payment_type,
      payment_status: payment.payment_status,
      payment_date: payment.payment_date
        ? payment.payment_date.split("T")[0]
        : "",
      transaction_id: p.transaction_id || "",
      notes: p.notes || "",
    });
  }, [payment]);

  const handleSubmit = () => {
    if (!payment) return;

    updatePaymentMutation.mutate(
      {
        paymentId: payment.id,
        data: {
          subscription_id: payment.subscription_id,
          member_id: payment.member_id,
          amount: parseFloat(formData.amount),
          payment_type: formData.payment_type,
          payment_status: formData.payment_status,
          payment_date: formData.payment_date,
          transaction_id: formData.transaction_id || undefined,
          notes: formData.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          router.replace(closeHref);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <RouteDialog title="Edit Payment" closeHref={closeHref}>
        <FormSkeleton fields={6} />
      </RouteDialog>
    );
  }

  if ((isError && !payment) || !payment || Number.isNaN(paymentId)) {
    return (
      <RouteDialog title="Edit Payment" closeHref={closeHref}>
        <p className="text-sm text-muted-foreground py-4">
          Payment not found.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Back
          </Button>
        </DialogFooter>
      </RouteDialog>
    );
  }

  const memberFromSub = (payment as any).subscription?.member?.full_name;
  const memberDirect =
    (payment as any).member?.full_name ||
    [
      (payment as any).member?.firstName || (payment as any).member?.first_name,
      (payment as any).member?.lastName || (payment as any).member?.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  const memberName = memberFromSub || memberDirect || "this payment";

  return (
    <RouteDialog
      title="Edit Payment"
      description={`Update payment details for ${memberName}`}
      closeHref={closeHref}
    >
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="amount" className="text-right">
            Amount
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, amount: e.target.value }))
            }
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="payment_type" className="text-right">
            Type
          </Label>
          <Select
            value={formData.payment_type}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, payment_type: value }))
            }
          >
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="payment_status" className="text-right">
            Status
          </Label>
          <Select
            value={formData.payment_status}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, payment_status: value }))
            }
          >
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="payment_date" className="text-right">
            Date
          </Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                payment_date: e.target.value,
              }))
            }
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="transaction_id" className="text-right">
            Transaction ID
          </Label>
          <Input
            id="transaction_id"
            value={formData.transaction_id}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                transaction_id: e.target.value,
              }))
            }
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="notes" className="text-right">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="col-span-3"
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={updatePaymentMutation.isPending}
        >
          {updatePaymentMutation.isPending ? "Updating..." : "Update Payment"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}

export default function EditPaymentPage() {
  return (
    <Suspense
      fallback={
        <RouteDialog title="Edit Payment" closeHref="/admin/payments">
          <FormSkeleton fields={6} />
        </RouteDialog>
      }
    >
      <EditPaymentContent />
    </Suspense>
  );
}
