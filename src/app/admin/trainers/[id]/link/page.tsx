"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useTrainer, useLinkTrainerAccount } from "@/hooks/useTrainers";
import { useAccounts } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSkeleton } from "@/components/skeletons";

export default function AdminTrainerLinkPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = String(params.id);
  const closeHref = `/admin/trainers/${trainerId}`;
  const onCancel = useCloseHref(closeHref);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const { data: accounts = [] } = useAccounts();
  const linkAccountMutation = useLinkTrainerAccount();

  const availableAccounts = accounts.filter(
    (account: any) =>
      !account.trainer_id && account.account_id !== trainer?.account_id,
  );

  if (isLoading) {
    return (
      <RouteDialog title="Link Account" closeHref={closeHref}>
        <FormSkeleton fields={2} />
      </RouteDialog>
    );
  }

  if (error || !trainer) {
    return (
      <RouteDialog title="Link Account" closeHref="/admin/trainers">
        <p className="text-sm text-muted-foreground">Trainer not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Link Account"
      description="Select an account to link to this trainer"
      closeHref={closeHref}
    >
      <div className="space-y-4 py-2">
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {availableAccounts.map((account: any) => (
              <SelectItem key={account.account_id} value={account.account_id}>
                {account.first_name} {account.last_name} ({account.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!selectedAccountId || linkAccountMutation.isPending}
          onClick={() => {
            linkAccountMutation.mutate(
              { trainerId, accountId: selectedAccountId },
              { onSuccess: () => router.replace(closeHref) },
            );
          }}
        >
          {linkAccountMutation.isPending ? "Linking..." : "Link Account"}
        </Button>
      </div>
    </RouteDialog>
  );
}
