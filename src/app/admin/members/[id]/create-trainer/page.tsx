"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useMemberDetails } from "@/hooks/useMemberDetails";
import { useCreateTrainerFromMember } from "@/hooks/useTrainers";
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
import { GraduationCap } from "lucide-react";

export default function AdminMemberCreateTrainerPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = String(params.id);
  const closeHref = `/admin/members/${memberId}`;
  const onCancel = useCloseHref(closeHref);
  const { data: details, isLoading, error } = useMemberDetails(memberId);
  const member = details?.member;
  const createTrainerMutation = useCreateTrainerFromMember();
  const [form, setForm] = useState({
    specialization: "",
    experienceYears: 0,
    bio: "",
    certification: "",
    status: "active",
  });

  if (isLoading) {
    return (
      <RouteDialog title="Create Trainer" closeHref={closeHref}>
        <FormSkeleton fields={4} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !member) {
    return (
      <RouteDialog title="Create Trainer" closeHref="/admin/members">
        <p className="text-sm text-muted-foreground">Member not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Create Trainer"
      description={`Add a trainer role for ${member.firstName} ${member.lastName} on the same profile. No new person is created.`}
      closeHref={closeHref}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={form.specialization}
            onChange={(e) =>
              setForm({ ...form, specialization: e.target.value })
            }
            placeholder="e.g. Strength, Yoga"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="experienceYears">Experience (years)</Label>
            <Input
              id="experienceYears"
              type="number"
              min={0}
              value={form.experienceYears}
              onChange={(e) =>
                setForm({
                  ...form,
                  experienceYears: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => setForm({ ...form, status: value })}
            >
              <SelectTrigger id="status">
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
        <div className="space-y-2">
          <Label htmlFor="certification">Certification</Label>
          <Input
            id="certification"
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
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
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
              { memberId, data: form },
              {
                onSuccess: (result: any) => {
                  const trainerId = result?.trainer?.id;
                  router.replace(
                    trainerId
                      ? `/admin/trainers/${trainerId}`
                      : closeHref,
                  );
                },
              },
            );
          }}
        >
          <GraduationCap className="mr-2 h-4 w-4" />
          {createTrainerMutation.isPending ? "Creating..." : "Create Trainer"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
