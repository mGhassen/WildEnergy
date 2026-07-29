"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCreateCategory } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import {
  CategoryForm,
  categoryFormDefaultValues,
  categoryFormSchema,
  type CategoryFormData,
} from "../category-form";

const CLOSE_HREF = "/admin/categories";

export default function AdminNewCategoryPage() {
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const createMutation = useCreateCategory();
  const { data: groups = [] } = useGroups();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryFormDefaultValues,
  });

  const handleSubmit = (data: CategoryFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => router.replace(CLOSE_HREF),
    });
  };

  return (
    <RouteDialog
      title="Create New Category"
      closeHref={CLOSE_HREF}
    >
      <CategoryForm
        form={form}
        groups={groups}
        onSubmit={handleSubmit}
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        onCancel={onCancel}
      />
    </RouteDialog>
  );
}
