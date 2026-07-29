"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useGroup, useUpdateGroup } from "@/hooks/useGroups";
import { useCategories } from "@/hooks/useCategories";
import { FormSkeleton } from "@/components/skeletons";
import {
  GroupForm,
  groupFormDefaultValues,
  groupFormSchema,
  groupToFormValues,
  toApiGroupPayload,
  type GroupFormData,
} from "../../group-form";

const CLOSE_HREF = "/admin/groups";

export default function AdminEditGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = Number(params.id);
  const { data: group, isLoading, error } = useGroup(groupId);
  const updateGroupMutation = useUpdateGroup();
  const { data: categories } = useCategories();

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: groupFormDefaultValues,
  });

  useEffect(() => {
    if (!group) return;
    form.reset(groupToFormValues(group));
  }, [group, form]);

  const handleSubmit = (data: GroupFormData) => {
    updateGroupMutation.mutate(
      { groupId, data: toApiGroupPayload(data) },
      { onSuccess: () => router.push(CLOSE_HREF) },
    );
  };

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return (
      <RouteDialog title="Edit Group" description="Invalid group" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">This group link is invalid.</p>
      </RouteDialog>
    );
  }

  if (isLoading) {
    return (
      <RouteDialog title="Edit Group" description="Loading…" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={5} />
      </RouteDialog>
    );
  }

  if (error || !group) {
    return (
      <RouteDialog title="Edit Group" description="Group not found" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">
          This group may have been deleted or the link is invalid.
        </p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Group"
      description="Update group information"
      closeHref={CLOSE_HREF}
    >
      <GroupForm
        form={form}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Update Group"
        isSubmitting={updateGroupMutation.isPending}
      />
    </RouteDialog>
  );
}
