"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useDeleteAdminClass } from "@/hooks/useClasses";
import {
  useAdminClasses,
  useAdminRegistrations,
  useAdminCheckins,
} from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";

const CLOSE_HREF = "/admin/classes";

export default function AdminDeleteClassPage() {
  const params = useParams();
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const classId = Number(params.id);

  const { data: rawClasses = [], isLoading } = useAdminClasses();
  const { data: registrations = [] } = useAdminRegistrations();
  const { data: checkins = [] } = useAdminCheckins();
  const deleteClassMutation = useDeleteAdminClass();

  const classItem = (Array.isArray(rawClasses) ? rawClasses : []).find(
    (c: any) => Number(c.id) === classId,
  );

  const linkedRegistrationsCount = (registrations as any[]).filter(
    (reg) => reg.classId === classId || reg.class_id === classId,
  ).length;
  const linkedCheckinsCount = (checkins as any[]).filter(
    (checkin) => checkin.classId === classId || checkin.class_id === classId,
  ).length;
  const blocked = linkedRegistrationsCount > 0 || linkedCheckinsCount > 0;

  const handleDelete = () => {
    deleteClassMutation.mutate(classId, {
      onSuccess: () => router.push(CLOSE_HREF),
    });
  };

  if (isLoading) {
    return (
      <RouteDialog title="Delete Class" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (!classItem || Number.isNaN(classId)) {
    return (
      <RouteDialog title="Delete Class" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">Class not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog title="Delete Class" closeHref={CLOSE_HREF}>
      {blocked ? (
        <div className="space-y-2 mb-4 text-sm">
          <p className="text-red-600 font-medium">Cannot delete this class!</p>
          <p>This class has:</p>
          <ul className="list-disc list-inside space-y-1">
            {linkedRegistrationsCount > 0 && (
              <li>
                <strong>{linkedRegistrationsCount}</strong> registration
                {linkedRegistrationsCount > 1 ? "s" : ""}
              </li>
            )}
            {linkedCheckinsCount > 0 && (
              <li>
                <strong>{linkedCheckinsCount}</strong> check-in
                {linkedCheckinsCount > 1 ? "s" : ""}
              </li>
            )}
          </ul>
          <p className="text-muted-foreground">
            Please remove all registrations and check-ins first before deleting
            this class.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete &quot;{classItem.name}&quot;? This
          action cannot be undone.
        </p>
      )}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          {blocked ? "Close" : "Cancel"}
        </Button>
        {!blocked && (
          <Button
            onClick={handleDelete}
            disabled={deleteClassMutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {deleteClassMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        )}
      </div>
    </RouteDialog>
  );
}
