"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { X } from "lucide-react";
import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean(),
  groupIds: z.array(z.number()).optional(),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

export const categoryFormDefaultValues: CategoryFormData = {
  name: "",
  description: "",
  color: "#4ECDC4",
  isActive: true,
  groupIds: [],
};

type CategoryFormProps = {
  form: UseFormReturn<CategoryFormData>;
  groups: Array<{ id: number; name: string; color?: string }> | undefined;
  onSubmit: (data: CategoryFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
};

export function CategoryForm({
  form,
  groups,
  onSubmit,
  submitLabel,
  isSubmitting,
  onCancel,
}: CategoryFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter category name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter category description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className="flex space-x-2">
                  <Input
                    type="color"
                    className="w-12 h-10 p-1 rounded border"
                    {...field}
                  />
                  <Input
                    placeholder="#3b82f6"
                    {...field}
                    className="flex-1"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groupIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Groups</FormLabel>
              <Select
                onValueChange={(value) => {
                  const groupId = Number(value);
                  const currentIds = field.value || [];
                  if (currentIds.includes(groupId)) {
                    field.onChange(currentIds.filter((id) => id !== groupId));
                  } else {
                    field.onChange([...currentIds, groupId]);
                  }
                }}
                value=""
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select groups (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(groups || []).map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value && field.value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((groupId: number) => {
                    const group = (groups || []).find((g) => g.id === groupId);
                    return (
                      <div
                        key={groupId}
                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group?.color }}
                        />
                        {group?.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => {
                            field.onChange(
                              field.value?.filter((id) => id !== groupId),
                            );
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Category is available for use
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function categoryToFormValues(category: {
  name: string;
  description?: string | null;
  color?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  groups?: Array<{ id: number }>;
}): CategoryFormData {
  return {
    name: category.name,
    description: category.description || "",
    color: category.color || "",
    isActive: category.isActive ?? category.is_active ?? true,
    groupIds: category.groups?.map((g) => g.id) || [],
  };
}
