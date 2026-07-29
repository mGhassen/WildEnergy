"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCategory, useUpdateCategory } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { FormSkeleton } from "@/components/skeletons";
import {
  CategoryForm,
  categoryFormDefaultValues,
  categoryFormSchema,
  categoryToFormValues,
  type CategoryFormData,
} from "../../category-form";

const CLOSE_HREF = "/admin/categories";

export default function AdminEditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const categoryId = Number(params.id);
  const { data: category, isLoading, error } = useCategory(categoryId);
  const updateMutation = useUpdateCategory();
  const { data: groups = [] } = useGroups();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryFormDefaultValues,
  });

  useEffect(() => {
    if (!category) return;
    form.reset(
      categoryToFormValues({
        ...category,
        isActive: category.is_active,
      }),
    );
  }, [category, form]);

  const handleSubmit = (data: CategoryFormData) => {
    updateMutation.mutate(
      { categoryId, data },
      { onSuccess: () => router.replace(CLOSE_HREF) },
    );
  };

  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return (
      <RouteDialog title="Edit Category" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">Invalid category.</p>
      </RouteDialog>
    );
  }

  if (isLoading) {
    return (
      <RouteDialog title="Edit Category" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={5} />
      </RouteDialog>
    );
  }

  if (error || !category) {
    return (
      <RouteDialog title="Edit Category" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">Category not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog title="Edit Category" closeHref={CLOSE_HREF}>
      <CategoryForm
        form={form}
        groups={groups}
        onSubmit={handleSubmit}
        submitLabel="Update"
        isSubmitting={updateMutation.isPending}
        onCancel={onCancel}
      />
    </RouteDialog>
  );
}
