"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DialogFooter } from "@/components/ui/dialog";
import { Binoculars, Loader2 } from "lucide-react";
import { useCreateMember, useMembers } from "@/hooks/useMembers";
import { findSimilarBlacklistedMembers } from "@/lib/fuzzy-name";

const CLOSE_HREF = "/admin/members";

export default function AdminNewMemberPage() {
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const createMemberMutation = useCreateMember();
  const { data: members = [] } = useMembers();
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    profileEmail: "",
    memberNotes: "",
    credit: 0,
    status: "active",
  });

  const deferredFirstName = useDeferredValue(createForm.firstName);
  const deferredLastName = useDeferredValue(createForm.lastName);

  const blacklistMatches = useMemo(
    () =>
      findSimilarBlacklistedMembers(
        deferredFirstName,
        deferredLastName,
        members,
      ),
    [deferredFirstName, deferredLastName, members],
  );

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
        <div className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-2 gap-4">
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
          {blacklistMatches.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label={`${blacklistMatches.length} similar blacklisted member${blacklistMatches.length === 1 ? "" : "s"}`}
                  title="Similar blacklisted members"
                >
                  <Binoculars className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <p className="mb-2 text-sm font-medium text-destructive">
                  Similar blacklisted members
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {blacklistMatches.map((member) => (
                    <li key={member.id}>
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="block rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        {member.first_name} {member.last_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          )}
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
