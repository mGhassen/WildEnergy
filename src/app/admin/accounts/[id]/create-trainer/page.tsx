"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCreateTrainerFromAccount } from "@/hooks/useAccounts";
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
import { UserPlus } from "lucide-react";

export default function AdminAccountCreateTrainerPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params.id);
  const closeHref = `/admin/accounts/${accountId}`;
  const onCancel = useCloseHref(closeHref);
  const createTrainerMutation = useCreateTrainerFromAccount();
  const [form, setForm] = useState({
    specialization: "",
    experienceYears: 0,
    bio: "",
    certification: "",
    hourlyRate: 0,
    status: "active",
  });

  return (
    <RouteDialog
      title="Create Trainer"
      description="Create a trainer record for this account. This will give the account access to trainer features."
      closeHref={closeHref}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            placeholder="e.g., Personal Training, Yoga, Pilates"
            value={form.specialization}
            onChange={(e) =>
              setForm({ ...form, specialization: e.target.value })
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="experienceYears">Experience (Years)</Label>
            <Input
              id="experienceYears"
              type="number"
              placeholder="0"
              value={form.experienceYears}
              onChange={(e) =>
                setForm({ ...form, experienceYears: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <Input
              id="hourlyRate"
              type="number"
              placeholder="0"
              value={form.hourlyRate}
              onChange={(e) =>
                setForm({ ...form, hourlyRate: Number(e.target.value) })
              }
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="certification">Certification</Label>
          <Input
            id="certification"
            placeholder="e.g., NASM, ACE, ACSM"
            value={form.certification}
            onChange={(e) =>
              setForm({ ...form, certification: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Brief description of the trainer's background and expertise..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trainerStatus">Status</Label>
          <Select
            value={form.status}
            onValueChange={(value) => setForm({ ...form, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={createTrainerMutation.isPending}
          onClick={() => {
            createTrainerMutation.mutate(
              { accountId, data: form },
              { onSuccess: () => router.push(closeHref) },
            );
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {createTrainerMutation.isPending ? "Creating..." : "Create Trainer"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
