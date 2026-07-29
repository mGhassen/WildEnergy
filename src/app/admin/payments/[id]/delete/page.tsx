"use client";

import { Suspense, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";
import { formatDate } from "@/lib/date";
import { formatCurrency } from "@/lib/config";
import { usePayment, usePayments, useDeletePayment } from "@/hooks/usePayments";

function safeFrom(from: string | null, fallback: string) {
  return from && from.startsWith("/") && !from.startsWith("//") ? from : fallback;
}

function DeletePaymentContent() {
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
  const deletePaymentMutation = useDeletePayment();

  const handleConfirm = () => {
    if (!payment) return;
    deletePaymentMutation.mutate(payment.id, {
      onSuccess: () => {
        router.replace(closeHref);
      },
    });
  };

  if (isLoading) {
    return (
      <RouteDialog title="Delete Payment" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if ((isError && !payment) || !payment || Number.isNaN(paymentId)) {
    return (
      <RouteDialog title="Delete Payment" closeHref={closeHref}>
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

  const memberName =
    payment.subscription?.member?.full_name ?? "Unknown member";

  return (
    <RouteDialog
      title="Delete Payment"
      description="Are you sure you want to delete this payment? This action cannot be undone."
      closeHref={closeHref}
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

export default function DeletePaymentPage() {
  return (
    <Suspense
      fallback={
        <RouteDialog title="Delete Payment" closeHref="/admin/payments">
          <FormSkeleton fields={2} showSubmit={false} />
        </RouteDialog>
      }
    >
      <DeletePaymentContent />
    </Suspense>
  );
}
