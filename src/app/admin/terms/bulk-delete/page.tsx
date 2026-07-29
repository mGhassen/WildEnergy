"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAdminTerms, useDeleteTerms } from "@/hooks/useAdminTerms";
import { Button } from "@/components/ui/button";
import { termIsDeletable } from "@/lib/terms-admin";
import { useToast } from "@/hooks/use-toast";

const CLOSE_HREF = "/admin/terms";

export default function AdminBulkDeleteTermsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onCancel = useCloseHref(CLOSE_HREF);
  const { toast } = useToast();
  const { data: terms = [] } = useAdminTerms();
  const deleteTermsMutation = useDeleteTerms();

  const ids = useMemo(
    () => (searchParams.get("ids") || "").split(",").filter(Boolean),
    [searchParams],
  );

  const deletableIds = useMemo(
    () =>
      ids.filter((id) => {
        const t = terms.find((x: any) => x.id === id);
        return t && termIsDeletable(t);
      }),
    [ids, terms],
  );

  return (
    <RouteDialog
      title="Delete Selected Terms"
      description={`Delete ${deletableIds.length} selected terms version(s)? Active versions cannot be deleted.`}
      closeHref={CLOSE_HREF}
    >
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          disabled={
            deletableIds.length === 0 || deleteTermsMutation.isPending
          }
          onClick={async () => {
            try {
              for (const id of deletableIds) {
                await deleteTermsMutation.mutateAsync(id);
              }
              toast({
                title: "Success",
                description: `Deleted ${deletableIds.length} terms version(s)`,
              });
              router.replace(CLOSE_HREF);
            } catch {
              /* toast from hook */
            }
          }}
        >
          {deleteTermsMutation.isPending ? "Deleting..." : "Delete Selected"}
        </Button>
      </div>
    </RouteDialog>
  );
}
