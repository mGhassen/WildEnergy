"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useUpdateAdminClass } from "@/hooks/useClasses";
import { useAdminClasses, useAdminCategories } from "@/hooks/useAdmin";
import { FormSkeleton } from "@/components/skeletons";
import {
  ClassForm,
  classFormDefaultValues,
  classFormSchema,
  classToFormValues,
  mapClassToApi,
  type ClassFormData,
} from "../../class-form";

const CLOSE_HREF = "/admin/classes";

export default function AdminEditClassPage() {
  const params = useParams();
  const router = useRouter();
  const classId = Number(params.id);
  const { data: rawClasses = [], isLoading } = useAdminClasses();
  const { data: rawCategories = [] } = useAdminCategories();
  const updateClassMutation = useUpdateAdminClass();
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const classItem = (Array.isArray(rawClasses) ? rawClasses : []).find(
    (c: any) => Number(c.id) === classId,
  );

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: classFormDefaultValues,
  });

  useEffect(() => {
    if (!classItem) return;
    form.reset(classToFormValues(classItem));
  }, [classItem, form]);

  const handleSubmit = (data: ClassFormData) => {
    updateClassMutation.mutate(
      { classId, data: mapClassToApi(data) },
      { onSuccess: () => router.push(CLOSE_HREF) },
    );
  };

  if (isLoading) {
    return (
      <RouteDialog title="Edit Class" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={6} />
      </RouteDialog>
    );
  }

  if (!classItem || Number.isNaN(classId)) {
    return (
      <RouteDialog title="Edit Class" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">Class not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Class"
      description="Update class information"
      closeHref={CLOSE_HREF}
    >
      <ClassForm
        form={form}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Update Class"
        isSubmitting={updateClassMutation.isPending}
      />
    </RouteDialog>
  );
}
