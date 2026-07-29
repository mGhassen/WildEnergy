"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAccount, useDeleteAccount } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";

export default function AdminAccountDeletePage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params.id);
  const closeHref = `/admin/accounts/${accountId}`;
  const listCloseHref = "/admin/accounts";
  const onCancel = useCloseHref(closeHref);
  const { data: account, isLoading, error } = useAccount(accountId);
  const deleteAccountMutation = useDeleteAccount();

  if (isLoading) {
    return (
      <RouteDialog title="Delete Account" closeHref={closeHref}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !account) {
    return (
      <RouteDialog title="Delete Account" closeHref={listCloseHref}>
        <p className="text-sm text-muted-foreground">Account not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Delete Account"
      description={`Are you sure you want to permanently delete ${account.first_name} ${account.last_name}? This action cannot be undone.`}
      closeHref={closeHref}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={deleteAccountMutation.isPending}
          onClick={() => {
            deleteAccountMutation.mutate(accountId, {
              onSuccess: () => router.push(listCloseHref),
            });
          }}
        >
          {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </RouteDialog>
  );
}
