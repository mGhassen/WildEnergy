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
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { z } from "zod";

export const planFormSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be a positive number"),
  durationDays: z.number().min(1, "Duration must be at least 1 day"),
  isActive: z.boolean(),
  planGroups: z.array(
    z.object({
      groupId: z.number().min(1, "Group is required"),
      sessionCount: z.number().min(1, "Session count must be at least 1"),
      isFree: z.boolean(),
    }),
  ),
});

export type PlanFormData = z.infer<typeof planFormSchema>;

export const planFormDefaultValues: PlanFormData = {
  name: "",
  description: "",
  price: 0,
  durationDays: 30,
  isActive: true,
  planGroups: [],
};

type PlanFormProps = {
  form: UseFormReturn<PlanFormData>;
  groups: Array<{ id: number; name: string; color?: string }> | undefined;
  onSubmit: (data: PlanFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
};

export function PlanForm({
  form,
  groups,
  onSubmit,
  submitLabel,
  isSubmitting,
}: PlanFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "planGroups",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Premium Monthly" />
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
                  placeholder="Brief description..."
                  rows={2}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (TND)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="49.99"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-end">
                <FormLabel className="text-sm font-medium">Plan Status</FormLabel>
                <div className="flex items-center space-x-2 mt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm">Active plan</FormLabel>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="durationDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan Duration</FormLabel>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[
                    { label: "1 Month", value: 30, description: "30 days" },
                    { label: "3 Months", value: 90, description: "90 days" },
                    { label: "6 Months", value: 180, description: "180 days" },
                    { label: "1 Year", value: 365, description: "365 days" },
                  ].map(({ label, value, description }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={field.value === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange(value)}
                      className="flex-1 flex-col h-auto py-3"
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-xs opacity-70">{description}</span>
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Custom:</span>
                  <Input
                    type="number"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="Enter days"
                    className="w-24"
                    min="1"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-semibold">Plan Groups</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ groupId: 0, sessionCount: 1, isFree: false })
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Group
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <FormField
                  control={form.control}
                  name={`planGroups.${index}.groupId`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups?.map((group) => (
                            <SelectItem
                              key={group.id}
                              value={group.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/20"
                                  style={{ backgroundColor: group.color }}
                                />
                                <span className="font-medium">{group.name}</span>
                              </div>
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
                  name={`planGroups.${index}.sessionCount`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Sessions"
                          className="h-10 text-center font-medium"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`planGroups.${index}.isFree`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-medium text-foreground">
                        Free
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No groups added yet. Click &quot;Add Group&quot; to include groups
              in this plan.
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function toApiPlanPayload(data: PlanFormData) {
  return {
    name: data.name,
    description: data.description,
    price: Number(data.price),
    duration_days: data.durationDays,
    is_active: data.isActive,
    planGroups:
      data.planGroups?.map((group) => ({
        groupId: group.groupId,
        sessionCount: group.sessionCount,
        isFree: group.isFree || false,
      })) || [],
  };
}

export function planToFormValues(plan: {
  name: string;
  description?: string | null;
  price: number;
  duration_days?: number;
  durationDays?: number;
  is_active?: boolean;
  isActive?: boolean;
  plan_groups?: Array<{
    group_id: number;
    session_count: number;
    is_free?: boolean;
  }>;
}): PlanFormData {
  return {
    name: plan.name,
    description: plan.description ?? "",
    price: Number(plan.price),
    durationDays: plan.duration_days ?? plan.durationDays ?? 30,
    isActive: plan.is_active ?? plan.isActive ?? true,
    planGroups:
      plan.plan_groups?.map((group) => ({
        groupId: group.group_id,
        sessionCount: group.session_count,
        isFree: group.is_free || false,
      })) || [],
  };
}
