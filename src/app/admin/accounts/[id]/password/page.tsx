"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAccount, useSetAccountPassword } from "@/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";

function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function AdminAccountPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params.id);
  const closeHref = `/admin/accounts/${accountId}`;
  const onCancel = useCloseHref(closeHref);
  const [setPasswordValue, setSetPasswordValue] = useState("");

  const { data: account, isLoading, error } = useAccount(accountId);
  const setPasswordMutation = useSetAccountPassword();

  if (isLoading) {
    return (
      <RouteDialog title="Set Password" closeHref={closeHref}>
        <FormSkeleton fields={2} />
      </RouteDialog>
    );
  }

  if (error || !account) {
    return (
      <RouteDialog title="Set Password" closeHref="/admin/accounts">
        <p className="text-sm text-muted-foreground">Account not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Set Password"
      description={`Set a new password for ${account.first_name} ${account.last_name}. You can enter a password or generate a strong one.`}
      closeHref={closeHref}
      className="sm:max-w-md"
    >
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Enter new password"
            value={setPasswordValue}
            onChange={(e) => setSetPasswordValue(e.target.value)}
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setSetPasswordValue(generatePassword())}
          >
            Generate
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!setPasswordValue || setPasswordMutation.isPending}
          onClick={() => {
            setPasswordMutation.mutate(
              { accountId, password: setPasswordValue },
              {
                onSuccess: () => router.push(closeHref),
              },
            );
          }}
        >
          Set Password
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
