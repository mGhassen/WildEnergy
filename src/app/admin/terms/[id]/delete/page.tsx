"use client";

import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAdminTermsById, useDeleteTerms } from "@/hooks/useAdminTerms";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";

const CLOSE_HREF = "/admin/terms";

export default function AdminDeleteTermsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const termId = String(params.id);
  const onCancel = useCloseHref(CLOSE_HREF);
  const { data: term, isLoading, error } = useAdminTermsById(termId);
  const deleteTermsMutation = useDeleteTerms();

  if (isLoading) {
    return (
      <RouteDialog title="Delete Terms Version" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !term) {
    return (
      <RouteDialog title="Delete Terms Version" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">Terms not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Delete Terms Version"
      description={`Are you sure you want to delete version "${term.version}"? This action cannot be undone.`}
      closeHref={CLOSE_HREF}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={deleteTermsMutation.isPending}
          onClick={async () => {
            try {
              await deleteTermsMutation.mutateAsync(termId);
              toast({ title: "Success", description: "Terms deleted" });
              router.replace(CLOSE_HREF);
            } catch {
              /* toast from hook */
            }
          }}
        >
          {deleteTermsMutation.isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </RouteDialog>
  );
}
