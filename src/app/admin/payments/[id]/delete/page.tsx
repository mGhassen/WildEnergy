"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { usePayment, useDeletePayment } from "@/hooks/usePayments";

const CLOSE_HREF = "/admin/payments";

export default function DeletePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const close = useCloseHref(CLOSE_HREF);
  const paymentId = Number(params.id);

  const { data: payment, isLoading, isError } = usePayment(paymentId);
  const deletePaymentMutation = useDeletePayment();

  const handleConfirm = () => {
    if (!payment) return;
    deletePaymentMutation.mutate(payment.id, {
      onSuccess: () => {
        router.push(CLOSE_HREF);
      },
    });
  };

  if (isLoading) {
    return (
      <RouteDialog title="Delete Payment" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (isError || !payment || Number.isNaN(paymentId)) {
    return (
      <RouteDialog title="Delete Payment" closeHref={CLOSE_HREF}>
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
    payment.subscription?.member?.full_name ?? "Unknown member";

  return (
    <RouteDialog
      title="Delete Payment"
      description="Are you sure you want to delete this payment? This action cannot be undone."
      closeHref={CLOSE_HREF}
    >
      <div className="py-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="font-medium">{memberName}</p>
          <p className="text-sm text-muted-foreground">
            Amount: {formatCurrency(Number(payment.amount))}
          </p>
          <p className="text-sm text-muted-foreground">
            Date:{" "}
            {payment.payment_date ? formatDate(payment.payment_date) : "N/A"}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={deletePaymentMutation.isPending}
        >
          {deletePaymentMutation.isPending ? "Deleting..." : "Delete Payment"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
