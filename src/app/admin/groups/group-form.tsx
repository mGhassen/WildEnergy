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

export const groupFormSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean(),
  categoryIds: z.array(z.number()).optional(),
});

export type GroupFormData = z.infer<typeof groupFormSchema>;

export const groupFormDefaultValues: GroupFormData = {
  name: "",
  description: "",
  color: "#4ECDC4",
  isActive: true,
  categoryIds: [],
};

type GroupFormProps = {
  form: UseFormReturn<GroupFormData>;
  categories: Array<{ id: number; name: string; color?: string }> | undefined;
  onSubmit: (data: GroupFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
};

export function GroupForm({
  form,
  categories,
  onSubmit,
  submitLabel,
  isSubmitting,
}: GroupFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Fitness Basics" />
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
                <Textarea
                  {...field}
                  placeholder="Brief description of the group..."
                />
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
                <Input type="color" {...field} />
              </FormControl>
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
                  Group is available for use
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
        <FormField
          control={form.control}
          name="categoryIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <Select
                onValueChange={(value) => {
                  const categoryId = Number(value);
                  const currentIds = field.value || [];
                  if (!currentIds.includes(categoryId)) {
                    field.onChange([...currentIds, categoryId]);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select categories to add" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories
                    ?.filter((cat) => !field.value?.includes(cat.id))
                    .map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {field.value && field.value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value.map((categoryId: number) => {
                    const category = categories?.find(
                      (cat) => cat.id === categoryId,
                    );
                    return (
                      <div
                        key={categoryId}
                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: category?.color }}
                        />
                        {category?.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => {
                            field.onChange(
                              field.value?.filter((id) => id !== categoryId),
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
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function toApiGroupPayload(data: GroupFormData) {
  return {
    name: data.name,
    description: data.description,
    color: data.color,
    isActive: data.isActive,
    categoryIds: data.categoryIds || [],
  };
}

export function groupToFormValues(group: {
  name: string;
  description?: string | null;
  color?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  categories?: Array<{ id: number }>;
}): GroupFormData {
  return {
    name: group.name,
    description: group.description ?? "",
    color: group.color ?? "#4ECDC4",
    isActive: group.is_active ?? group.isActive ?? true,
    categoryIds: group.categories?.map((cat) => cat.id) || [],
  };
}
