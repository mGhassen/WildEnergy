"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import {
  useGroup,
  useCheckGroupDeletion,
  useDeleteGroup,
} from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/skeletons";
import { ExternalLink } from "lucide-react";

const CLOSE_HREF = "/admin/groups";

export default function AdminDeleteGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = Number(params.id);
  const onCancel = useCloseHref(CLOSE_HREF);

  const { data: group, isLoading, error } = useGroup(groupId);
  const checkDeletionMutation = useCheckGroupDeletion();
  const deleteGroupMutation = useDeleteGroup();
  const [linkedPlans, setLinkedPlans] = useState<string[]>([]);

  useEffect(() => {
    if (!Number.isFinite(groupId) || groupId <= 0) return;
    checkDeletionMutation.mutate(groupId, {
      onSuccess: (response) => {
        setLinkedPlans(response.canDelete ? [] : response.linkedPlans || []);
      },
      onError: () => setLinkedPlans([]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const confirmDelete = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => router.push(CLOSE_HREF),
    });
  };

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return (
      <RouteDialog title="Delete Group" description="Invalid group" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">This group link is invalid.</p>
      </RouteDialog>
    );
  }

  if (isLoading) {
    return (
      <RouteDialog title="Delete Group" description="Loading…" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={2} showSubmit={false} />
      </RouteDialog>
    );
  }

  if (error || !group) {
    return (
      <RouteDialog title="Delete Group" description="Group not found" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">
          This group may have been deleted or the link is invalid.
        </p>
      </RouteDialog>
    );
  }

  const cannotDelete = linkedPlans.length > 0;

  return (
    <RouteDialog
      title={cannotDelete ? "Cannot Delete Group" : "Delete Group"}
      description={
        cannotDelete
          ? `The group "${group.name}" cannot be deleted because it's currently used in plans.`
          : `Are you sure you want to delete the group "${group.name}"? This will unlink all categories from this group but will not delete the categories themselves.`
      }
      closeHref={CLOSE_HREF}
      className="sm:max-w-md"
    >
      {group.categories && group.categories.length > 0 && (
        <div className="mt-2 mb-4 p-3 bg-muted/30 rounded-lg border">
          <div className="font-medium text-sm text-foreground mb-2">
            Categories that will be unlinked:
          </div>
          <div className="flex flex-wrap gap-2">
            {group.categories.map((category: any, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 text-xs bg-background border px-2 py-1 rounded-md"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category.color || "#6B7280" }}
                />
                {category.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {cannotDelete && (
        <div className="mt-2 mb-4 p-5 bg-destructive/50 border-l-4 border-destructive rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground mb-2">
                Cannot Delete Group
              </h4>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                This group is currently being used in the following plans and
                cannot be deleted:
              </p>
              <div className="space-y-2 mb-4">
                {linkedPlans.map((planName, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-background/80 rounded-md border border-destructive/20"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {planName}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-foreground border-destructive/30 hover:bg-destructive/5 hover:border-destructive/50 transition-colors"
                onClick={() => router.push("/admin/plans")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Plans
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={confirmDelete}
          disabled={
            cannotDelete ||
            deleteGroupMutation.isPending ||
            checkDeletionMutation.isPending
          }
          className={`flex-1 ${
            cannotDelete
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
        >
          {cannotDelete
            ? "Cannot Delete"
            : deleteGroupMutation.isPending
              ? "Deleting..."
              : "Delete Group"}
        </Button>
      </div>
    </RouteDialog>
  );
}
