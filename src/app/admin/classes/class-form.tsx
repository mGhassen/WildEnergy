"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DIFFICULTY_OPTIONS,
  normalizeDifficulties,
  type DifficultyLevel,
} from "@/lib/difficulty";

export const classFormSchema = insertClassSchema;
export type ClassFormData = z.infer<typeof classFormSchema>;

const FALLBACK_BASE_COLOR = "#64748b";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Random shade in the same hue family as the category color. */
export function shadeFromCategoryColor(baseHex?: string | null) {
  const cleaned = (baseHex || "").trim().replace(/^#/, "");
  const normalized =
    /^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)
      ? `#${cleaned}`
      : FALLBACK_BASE_COLOR;

  const { h, s, l } = hexToHsl(normalized);
  const nextH = (h + (Math.random() * 24 - 12) + 360) % 360;
  const nextS = clamp(s + (Math.random() * 28 - 10), 40, 90);
  const nextL = clamp(l + (Math.random() * 28 - 14), 32, 62);
  return hslToHex(nextH, nextS, nextL);
}

export const classFormDefaultValues: ClassFormData = {
  name: "",
  description: "",
  categoryId: null,
  color: shadeFromCategoryColor(FALLBACK_BASE_COLOR),
  difficulty: ["beginner"],
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
    color: data.color,
    difficulty: data.difficulty,
    duration: data.durationMinutes,
    max_capacity: data.maxCapacity,
    equipment: data.equipment,
    is_active: data.isActive,
  };
}

type ClassFormProps = {
  form: UseFormReturn<ClassFormData>;
  categories: Array<{ id: number; name: string; color?: string | null }>;
  onSubmit: (data: ClassFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
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
                    form.setValue(
                      "color",
                      shadeFromCategoryColor(FALLBACK_BASE_COLOR),
                    );
                    return;
                  }
                  const categoryId = Number(value);
                  field.onChange(categoryId);
                  const category = categories.find((c) => c.id === categoryId);
                  form.setValue(
                    "color",
                    shadeFromCategoryColor(category?.color),
                  );
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
                  <Input placeholder="#3b82f6" {...field} className="flex-1" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="difficulty"
          render={() => (
            <FormItem>
              <FormLabel>Difficulty</FormLabel>
              <div className="flex flex-wrap gap-4">
                {DIFFICULTY_OPTIONS.map((level) => (
                  <FormField
                    key={level}
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(level)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, level]
                                  : current.filter((v) => v !== level),
                              );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {DIFFICULTY_LABELS[level]}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
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
  color?: string | null;
  category?: { color?: string | null } | null;
  categories?: { color?: string | null } | null;
  difficulty?: string | string[] | null;
  durationMinutes?: number;
  duration?: number;
  maxCapacity?: number;
  max_capacity?: number;
  equipment?: string | null;
  isActive?: boolean;
  is_active?: boolean;
}): ClassFormData {
  const categoryColor =
    classItem.category?.color ?? classItem.categories?.color ?? null;
  return {
    name: classItem.name,
    description: classItem.description ?? "",
    categoryId: classItem.categoryId ?? classItem.category_id ?? null,
    color: classItem.color || shadeFromCategoryColor(categoryColor),
    difficulty: normalizeDifficulties(classItem.difficulty),
    durationMinutes: classItem.durationMinutes ?? classItem.duration ?? 60,
    maxCapacity: classItem.maxCapacity ?? classItem.max_capacity ?? 20,
    equipment: classItem.equipment || "",
    isActive: classItem.isActive ?? classItem.is_active ?? true,
  };
}
