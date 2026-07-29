"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAccount, useLinkAccountTrainer } from "@/hooks/useAccounts";
import { useTrainers } from "@/hooks/useTrainers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSkeleton } from "@/components/skeletons";
import { Link, UserMinus } from "lucide-react";

export default function AdminAccountLinkPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params.id);
  const closeHref = `/admin/accounts/${accountId}`;
  const onCancel = useCloseHref(closeHref);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");

  const { data: account, isLoading, error } = useAccount(accountId);
  const { data: trainers = [] } = useTrainers();
  const linkTrainerMutation = useLinkAccountTrainer();

  const availableTrainers = (trainers as any[]).filter((t) => !t.account_id);

  if (isLoading) {
    return (
      <RouteDialog title="Link Trainer to Account" closeHref={closeHref}>
        <FormSkeleton fields={2} />
      </RouteDialog>
    );
  }

  if (error || !account) {
    return (
      <RouteDialog title="Link Trainer to Account" closeHref="/admin/accounts">
        <p className="text-sm text-muted-foreground">Account not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Link Trainer to Account"
      description="Select a trainer to link to this account. Only trainers without existing account links are available."
      closeHref={closeHref}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Available Trainers</label>
          <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a trainer to link" />
            </SelectTrigger>
            <SelectContent>
              {availableTrainers.length === 0 ? (
                <SelectItem value="none" disabled>
                  No available trainers
                </SelectItem>
              ) : (
                availableTrainers.map((trainer) => (
                  <SelectItem key={trainer.id} value={trainer.id}>
                    {trainer.first_name} {trainer.last_name} (
                    {trainer.specialization})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        {availableTrainers.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <UserMinus className="w-8 h-8 mx-auto mb-2" />
            <p>No available trainers to link</p>
          </div>
        )}
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!selectedTrainerId || linkTrainerMutation.isPending}
          onClick={() => {
            linkTrainerMutation.mutate(
              { accountId, trainerId: selectedTrainerId },
              { onSuccess: () => router.push(closeHref) },
            );
          }}
        >
          <Link className="w-4 h-4 mr-2" />
          {linkTrainerMutation.isPending ? "Linking..." : "Link Trainer"}
        </Button>
      </div>
    </RouteDialog>
  );
}
