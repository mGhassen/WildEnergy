"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useAdminClasses } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";
import type { AdminClass } from "@/lib/api/admin";

const CLOSE_HREF = "/admin/categories";

export default function AdminDeleteCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const onCancel = useCloseHref(CLOSE_HREF);
  const categoryId = Number(params.id);

  const { data: category, isLoading, error } = useCategory(categoryId);
  const { data: classes = [] } = useAdminClasses();
  const deleteMutation = useDeleteCategory();

  const linkedClasses = (classes as AdminClass[]).filter(
    (cls) => cls.category_id === categoryId,
  );

  const confirmDelete = () => {
    deleteMutation.mutate(categoryId, {
      onSuccess: () => router.replace(CLOSE_HREF),
      onError: (err: any) => {
        if (err.status === 400 && err.classes && err.classes.length > 0) {
          const classNames = err.classes.map((cls: any) => cls.name).join(", ");
          toast({
            title: "Cannot delete category",
            description: `This category is being used by the following classes: ${classNames}. Please reassign or delete these classes first.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: err.message || "Failed to delete category",
            variant: "destructive",
          });
        }
      },
    });
  };

  if (isLoading) {
    return (
      <RouteDialog title="Delete Category" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !category || Number.isNaN(categoryId)) {
    return (
      <RouteDialog title="Delete Category" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground py-4">Category not found.</p>
        <Button variant="outline" onClick={onCancel}>
          Back
        </Button>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Delete Category"
      description={`Are you sure you want to delete the category "${category.name}"?`}
      closeHref={CLOSE_HREF}
    >
      {linkedClasses.length > 0 && (
        <div className="my-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="text-amber-800 dark:text-amber-200 font-medium">
            This category is currently used by {linkedClasses.length} class
            {linkedClasses.length !== 1 ? "es" : ""}:
          </div>
          <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            {linkedClasses.map((cls) => (
              <li key={cls.id}>• {cls.name}</li>
            ))}
          </ul>
          <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            <strong>Deletion will be blocked</strong> to maintain data integrity.
            Please reassign or delete these classes first.
          </div>
        </div>
      )}
      <p className="text-sm text-muted-foreground mb-4">
        This action cannot be undone.
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={confirmDelete}
          disabled={linkedClasses.length > 0 || deleteMutation.isPending}
          className={`flex-1 ${
            linkedClasses.length > 0
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {linkedClasses.length > 0
            ? "Cannot Delete (Has Classes)"
            : deleteMutation.isPending
              ? "Deleting..."
              : "Delete Category"}
        </Button>
      </div>
    </RouteDialog>
  );
}
