"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RouteDialog, useCloseHref } from "@/components/route-dialog";
import { useCreateTerms } from "@/hooks/useAdminTerms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const CLOSE_HREF = "/admin/terms";

export default function AdminNewTermsPage() {
  const router = useRouter();
  const onCancel = useCloseHref(CLOSE_HREF);
  const { toast } = useToast();
  const createTermsMutation = useCreateTerms();
  const [formData, setFormData] = useState({
    version: "",
    title: "",
    content: "",
    is_active: false,
    term_type: "terms" as "terms" | "interior_regulation",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version || !formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    try {
      await createTermsMutation.mutateAsync(formData);
      toast({ title: "Success", description: "Terms created successfully" });
      router.replace(CLOSE_HREF);
    } catch {
      /* toast from hook */
    }
  };

  return (
    <RouteDialog
      title="Create New Terms"
      description="Create a new version of terms and conditions"
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
              placeholder="e.g., 1.0, 2.0"
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
              placeholder="e.g., Terms of Service v2.0"
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
            placeholder="Enter the terms and conditions content (Markdown supported)"
            rows={15}
            className="font-mono text-sm"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTermsMutation.isPending}>
            {createTermsMutation.isPending ? "Saving..." : "Create"}
          </Button>
        </div>
      </form>
    </RouteDialog>
  );
}
