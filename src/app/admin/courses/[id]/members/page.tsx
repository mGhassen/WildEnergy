"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog } from "@/components/route-dialog";
import { Button } from "@/components/ui/button";

/**
 * Path entry for course member management.
 * The full member-picker UI remains on the course detail page (local dialog)
 * when opened from there; this route closes back to the detail page.
 * Prefer opening via the detail page "Add Members" control.
 */
export default function AdminCourseMembersPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params.id);
  const closeHref = `/admin/courses/${courseId}`;

  useEffect(() => {
    // Bounce to detail with a hash so detail can open the local members dialog
    router.replace(`${closeHref}?manageMembers=1`);
  }, [closeHref, router]);

  return (
    <RouteDialog title="Manage Course Members" closeHref={closeHref}>
      <p className="text-sm text-muted-foreground mb-4">
        Opening member management…
      </p>
      <Button variant="outline" onClick={() => router.push(closeHref)}>
        Back to course
      </Button>
    </RouteDialog>
  );
}
