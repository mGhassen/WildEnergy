"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useCreateGroup } from "@/hooks/useGroups";
import { useCategories } from "@/hooks/useCategories";
import {
  GroupForm,
  groupFormDefaultValues,
  groupFormSchema,
  toApiGroupPayload,
  type GroupFormData,
} from "../group-form";

export default function AdminNewGroupPage() {
  const router = useRouter();
  const createGroupMutation = useCreateGroup();
  const { data: categories } = useCategories();

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: groupFormDefaultValues,
  });

  const handleSubmit = (data: GroupFormData) => {
    createGroupMutation.mutate(toApiGroupPayload(data), {
      onSuccess: () => router.push("/admin/groups"),
    });
  };

  return (
    <RouteDialog
      title="Add New Group"
      description="Add a new category group"
      closeHref="/admin/groups"
    >
      <GroupForm
        form={form}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Create Group"
        isSubmitting={createGroupMutation.isPending}
      />
    </RouteDialog>
  );
}
