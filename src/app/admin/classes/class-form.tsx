"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { DialogFooter } from "@/components/ui/dialog";
import { UseFormReturn } from "react-hook-form";
import { insertClassSchema } from "@/shared/zod-schemas";
import { z } from "zod";

export const classFormSchema = insertClassSchema;
export type ClassFormData = z.infer<typeof classFormSchema>;

export const classFormDefaultValues: ClassFormData = {
  name: "",
  description: "",
  categoryId: null,
  difficulty: "beginner",
  durationMinutes: 60,
  maxCapacity: 20,
  equipment: "",
  isActive: true,
};

export function mapClassToApi(data: ClassFormData) {
  return {
    name: data.name,
    description: data.description,
    category_id: data.categoryId ? Number(data.categoryId) : null,
    difficulty: data.difficulty,
    duration: data.durationMinutes,
    max_capacity: data.maxCapacity,
    equipment: data.equipment,
    is_active: data.isActive,
  };
}

type ClassFormProps = {
  form: UseFormReturn<ClassFormData>;
  categories: Array<{ id: number; name: string }>;
  onSubmit: (data: ClassFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
};

export function ClassForm({
  form,
  categories,
  onSubmit,
  submitLabel,
  isSubmitting,
}: ClassFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., HIIT Training" />
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
                  placeholder="Brief description of the class..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={(value) => {
                  if (value === "none") {
                    field.onChange(null);
                  } else {
                    field.onChange(Number(value));
                  }
                }}
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseInt(value, 10),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Capacity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(
                        value === "" ? undefined : parseInt(value, 10),
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="equipment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Dumbbells, Treadmill"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function classToFormValues(classItem: {
  name: string;
  description?: string | null;
  categoryId?: number | null;
  category_id?: number | null;
  difficulty?: string | null;
  durationMinutes?: number;
  duration?: number;
  maxCapacity?: number;
  max_capacity?: number;
  equipment?: string | null;
  isActive?: boolean;
  is_active?: boolean;
}): ClassFormData {
  return {
    name: classItem.name,
    description: classItem.description ?? "",
    categoryId: classItem.categoryId ?? classItem.category_id ?? null,
    difficulty: (classItem.difficulty as ClassFormData["difficulty"]) || "beginner",
    durationMinutes: classItem.durationMinutes ?? classItem.duration ?? 60,
    maxCapacity: classItem.maxCapacity ?? classItem.max_capacity ?? 20,
    equipment: classItem.equipment || "",
    isActive: classItem.isActive ?? classItem.is_active ?? true,
  };
}
