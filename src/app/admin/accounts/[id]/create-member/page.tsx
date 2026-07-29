"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCreateMemberFromAccount } from "@/hooks/useAccounts";
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

export default function AdminAccountCreateMemberPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = String(params.id);
  const closeHref = `/admin/accounts/${accountId}`;
  const onCancel = useCloseHref(closeHref);
  const createMemberMutation = useCreateMemberFromAccount();
  const [form, setForm] = useState({
    memberNotes: "",
    credit: 0,
    status: "active",
  });

  return (
    <RouteDialog
      title="Create Member"
      description="Create a member record for this account. This will give the account access to member features."
      closeHref={closeHref}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="memberNotes">Member Notes</Label>
          <Textarea
            id="memberNotes"
            placeholder="Optional notes about this member..."
            value={form.memberNotes}
            onChange={(e) => setForm({ ...form, memberNotes: e.target.value })}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="credit">Credit</Label>
            <Input
              id="credit"
              type="number"
              placeholder="0"
              value={form.credit}
              onChange={(e) =>
                setForm({ ...form, credit: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memberStatus">Status</Label>
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
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={createMemberMutation.isPending}
          onClick={() => {
            createMemberMutation.mutate(
              { accountId, data: form },
              { onSuccess: () => router.push(closeHref) },
            );
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {createMemberMutation.isPending ? "Creating..." : "Create Member"}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
