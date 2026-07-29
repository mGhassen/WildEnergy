"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useAdminTermsById, useUpdateTerms } from "@/hooks/useAdminTerms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";

const CLOSE_HREF = "/admin/terms";

export default function AdminEditTermsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const termId = String(params.id);
  const closeHref = `/admin/terms/${termId}`;
  const onCancel = useCloseHref(CLOSE_HREF);
  const { data: term, isLoading, error } = useAdminTermsById(termId);
  const updateTermsMutation = useUpdateTerms();
  const [formData, setFormData] = useState({
    version: "",
    title: "",
    content: "",
    is_active: false,
    term_type: "terms" as "terms" | "interior_regulation",
  });

  useEffect(() => {
    if (!term) return;
    setFormData({
      version: term.version,
      title: term.title,
      content: term.content,
      is_active: term.is_active,
      term_type:
        term.term_type ||
        (term.title.toLowerCase().includes("interior regulation")
          ? "interior_regulation"
          : "terms"),
    });
  }, [term]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (term?.is_active) {
      toast({
        title: "Cannot edit",
        description: "Active terms versions cannot be edited.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.version || !formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateTermsMutation.mutateAsync({ id: termId, data: formData });
      toast({ title: "Success", description: "Terms updated successfully" });
      router.replace(CLOSE_HREF);
    } catch {
      /* toast from hook */
    }
  };

  if (isLoading) {
    return (
      <RouteDialog title="Edit Terms" closeHref={CLOSE_HREF}>
        <FormSkeleton fields={4} />
      </RouteDialog>
    );
  }

  if (error || !term) {
    return (
      <RouteDialog title="Edit Terms" closeHref={CLOSE_HREF}>
        <p className="text-sm text-muted-foreground">Terms not found.</p>
      </RouteDialog>
    );
  }

  return (
    <RouteDialog
      title="Edit Terms"
      description="Update the terms and conditions"
      closeHref={CLOSE_HREF}
      className="max-w-4xl max-h-[80vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="version">Version *</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="term_type">Type *</Label>
          <select
            id="term_type"
            value={formData.term_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                term_type: e.target.value as "terms" | "interior_regulation",
              })
            }
            className="w-full p-2 border border-input rounded-md bg-background"
          >
            <option value="terms">
              Terms & Conditions (Requires Acceptance)
            </option>
            <option value="interior_regulation">
              Interior Regulation (Display Only)
            </option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            rows={15}
            className="font-mono text-sm"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateTermsMutation.isPending}>
            {updateTermsMutation.isPending ? "Saving..." : "Update"}
          </Button>
        </div>
      </form>
    </RouteDialog>
  );
}
