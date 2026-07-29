"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
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
import { Loader2 } from "lucide-react";
import { useCreateMember } from "@/hooks/useMembers";

const CLOSE_HREF = "/admin/members";

export default function AdminNewMemberPage() {
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const createMemberMutation = useCreateMember();
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    profileEmail: "",
    memberNotes: "",
    credit: 0,
    status: "active",
  });

  const handleCreateMember = () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim()) return;
    createMemberMutation.mutate(
      {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: createForm.phone.trim() || undefined,
        profileEmail: createForm.profileEmail.trim() || undefined,
        memberNotes: createForm.memberNotes.trim() || undefined,
        credit: createForm.credit,
        status: createForm.status,
      },
      {
        onSuccess: (member) => {
          router.replace(`/admin/members/${member.id}`);
        },
      },
    );
  };

  return (
    <RouteDialog
      title="Add Member"
      description="Create a member without an account. You can create or link an account later from the member page."
      closeHref={CLOSE_HREF}
    >
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={createForm.firstName}
              onChange={(e) =>
                setCreateForm({ ...createForm, firstName: e.target.value })
              }
              placeholder="First name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={createForm.lastName}
              onChange={(e) =>
                setCreateForm({ ...createForm, lastName: e.target.value })
              }
              placeholder="Last name"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={createForm.phone}
            onChange={(e) =>
              setCreateForm({ ...createForm, phone: e.target.value })
            }
            placeholder="Phone number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileEmail">Contact Email</Label>
          <Input
            id="profileEmail"
            type="email"
            value={createForm.profileEmail}
            onChange={(e) =>
              setCreateForm({ ...createForm, profileEmail: e.target.value })
            }
            placeholder="Optional contact email (not for login)"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="credit">Credit</Label>
            <Input
              id="credit"
              type="number"
              min={0}
              value={createForm.credit}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  credit: Number(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={createForm.status}
              onValueChange={(value) =>
                setCreateForm({ ...createForm, status: value })
              }
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
          <Label htmlFor="memberNotes">Notes</Label>
          <Textarea
            id="memberNotes"
            value={createForm.memberNotes}
            onChange={(e) =>
              setCreateForm({ ...createForm, memberNotes: e.target.value })
            }
            placeholder="Optional notes"
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={createMemberMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateMember}
          disabled={
            createMemberMutation.isPending ||
            !createForm.firstName.trim() ||
            !createForm.lastName.trim()
          }
        >
          {createMemberMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Member"
          )}
        </Button>
      </DialogFooter>
    </RouteDialog>
  );
}
