"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useTrainer, useCreateAccountFromTrainer } from "@/hooks/useTrainers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DialogFooter } from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/skeletons";

export default function AdminTrainerCreateAccountPage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = String(params.id);
  const closeHref = `/admin/trainers/${trainerId}`;
  const onCancel = useCloseHref(closeHref);
  const { data: trainer, isLoading, error } = useTrainer(trainerId);
  const createAccountMutation = useCreateAccountFromTrainer();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    isAdmin: false,
  });
  const [localError, setLocalError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <RouteDialog title="Create Account" closeHref={closeHref}>
        <FormSkeleton fields={4} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !trainer) {
    return (
      <RouteDialog title="Create Account" closeHref="/admin/trainers">
        <p className="text-sm text-muted-foreground">Trainer not found.</p>
      </RouteDialog>
    );
  }

  if (trainer.account_id) {
    return (
      <RouteDialog title="Create Account" closeHref={closeHref}>
        <p className="text-sm text-muted-foreground">
          This trainer already has a login account.
        </p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Create Account"
      description={`Create a login for ${trainer.first_name} ${trainer.last_name}. Uses the same profile.`}
      closeHref={closeHref}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="email">Login Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={trainer.profile_email || "trainer@example.com"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="isAdmin">Admin access</Label>
          <Switch
            id="isAdmin"
            checked={form.isAdmin}
            onCheckedChange={(checked) =>
              setForm({ ...form, isAdmin: checked })
            }
          />
        </div>
        {localError && (
          <p className="text-sm text-destructive">{localError}</p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={createAccountMutation.isPending}
          onClick={() => {
            setLocalError(null);
            if (form.password !== form.confirmPassword) {
              setLocalError("Passwords do not match");
              return;
            }
            if (form.password.length < 6) {
              setLocalError("Password must be at least 6 characters");
              return;
            }
            if (!form.email.trim()) {
              setLocalError("Email is required");
              return;
            }
            createAccountMutation.mutate(
              {
                trainerId,
                data: {
                  email: form.email.trim(),
                  password: form.password,
                  isAdmin: form.isAdmin,
                },
              },
              { onSuccess: () => router.replace(closeHref) },
            );
          }}
        >
          {createAccountMutation.isPending ? "Creating..." : "Create Account"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
