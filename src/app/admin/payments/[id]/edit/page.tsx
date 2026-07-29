"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { usePayment, useUpdatePayment } from "@/hooks/usePayments";

const CLOSE_HREF = "/admin/payments";

export default function EditPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const close = useCloseHref(CLOSE_HREF);
  const paymentId = Number(params.id);

  const { data: payment, isLoading, isError } = usePayment(paymentId);
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
          router.push(CLOSE_HREF);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <RouteDialog title="Edit Payment" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={6} />
      </RouteDialog>
    );
  }

  if (isError || !payment || Number.isNaN(paymentId)) {
    return (
      <RouteDialog title="Edit Payment" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground py-4">
          Payment not found.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Back to payments
          </Button>
        </DialogFooter>
      </RouteDialog>
    );
  }

  const memberName =
    payment.subscription?.member?.full_name ?? "this payment";

  return (
    <RouteDialog
      title="Edit Payment"
      description={`Update payment details for ${memberName}`}
      closeHref={CLOSE_HREF}
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
