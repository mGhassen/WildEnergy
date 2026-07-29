"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RouteDialog } from "@/components/route-dialog";
import { useCreateAdminClass } from "@/hooks/useClasses";
import { useAdminCategories } from "@/hooks/useAdmin";
import {
  ClassForm,
  classFormDefaultValues,
  classFormSchema,
  mapClassToApi,
  type ClassFormData,
} from "../class-form";

const CLOSE_HREF = "/admin/classes";

export default function AdminNewClassPage() {
  const router = useRouter();
  const createClassMutation = useCreateAdminClass();
  const { data: rawCategories = [] } = useAdminCategories();
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: classFormDefaultValues,
  });

  const handleSubmit = (data: ClassFormData) => {
    createClassMutation.mutate(mapClassToApi(data), {
      onSuccess: () => router.replace(CLOSE_HREF),
    });
  };

  return (
    <RouteDialog
      title="Add New Class"
      description="Add a new class to the gym"
      closeHref={CLOSE_HREF}
    >
      <ClassForm
        form={form}
        categories={categories}
        onSubmit={handleSubmit}
        submitLabel="Create Class"
        isSubmitting={createClassMutation.isPending}
      />
    </RouteDialog>
  );
}
