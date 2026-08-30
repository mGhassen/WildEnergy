"use client";

import { useState } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

type GroupOption = { id: number; name: string; color?: string };

function PoolGroupPicker({
  groups,
  value,
  onChange,
}: {
  groups: GroupOption[] | undefined;
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = (groups || []).filter((g) => value.includes(g.id));

  const toggle = (id: number) => {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  };

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => toggle(group.id)}
              className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm hover:bg-muted/80"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: group.color || "#6B7280" }}
              />
              {group.name}
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {value.length === 0
                ? "Search and add groups…"
                : `${value.length} group${value.length === 1 ? "" : "s"} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search groups…" />
            <CommandList className="max-h-56">
              <CommandEmpty>No groups found.</CommandEmpty>
              <CommandGroup>
                {(groups || []).map((group) => {
                  const isSelected = value.includes(group.id);
                  return (
                    <CommandItem
                      key={group.id}
                      value={group.name}
                      onSelect={() => toggle(group.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span
                        className="mr-2 h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: group.color || "#6B7280" }}
                      />
                      {group.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const planFormSchema = z
  .object({
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
    planSessionPools: z.array(
      z.object({
        id: z.number().positive().optional(),
        sessionCount: z.number().min(1, "Session count must be at least 1"),
        isFree: z.boolean(),
        groupIds: z
          .array(z.number().min(1))
          .min(1, "Pool needs at least 1 group"),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const dedicatedIds = new Set<number>();
    data.planGroups.forEach((g, index) => {
      if (!g.groupId) return;
      if (dedicatedIds.has(g.groupId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Group already used in another allocation",
          path: ["planGroups", index, "groupId"],
        });
      }
      dedicatedIds.add(g.groupId);
    });
    data.planSessionPools.forEach((pool, poolIndex) => {
      const seen = new Set<number>();
      pool.groupIds.forEach((id) => {
        if (seen.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate group in this pool",
            path: ["planSessionPools", poolIndex, "groupIds"],
          });
        }
        seen.add(id);
        if (dedicatedIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Group already used in dedicated allocations",
            path: ["planSessionPools", poolIndex, "groupIds"],
          });
        }
      });
    });
  });

export type PlanFormData = z.infer<typeof planFormSchema>;

export const planFormDefaultValues: PlanFormData = {
  name: "",
  description: "",
  price: 0,
  durationDays: 30,
  isActive: true,
  planGroups: [],
  planSessionPools: [],
};

type PlanFormProps = {
  form: UseFormReturn<PlanFormData>;
  groups: GroupOption[] | undefined;
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
  const {
    fields: poolFields,
    append: appendPool,
    remove: removePool,
  } = useFieldArray({
    control: form.control,
    name: "planSessionPools",
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

        {/* Dedicated groups UI hidden — planGroups still in form/API for later */}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-base font-semibold">
                Package pools
              </FormLabel>
              <p className="text-xs text-muted-foreground">
                One session count usable in any of the selected groups
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendPool({ sessionCount: 1, isFree: false, groupIds: [] })
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add pool
            </Button>
          </div>

          {poolFields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No package pools yet.
            </p>
          ) : (
            <div className="divide-y">
              {poolFields.map((field, index) => (
                <div key={field.id} className="py-4 space-y-3 first:pt-2">
                  <FormField
                    control={form.control}
                    name={`planSessionPools.${index}.id`}
                    render={({ field: idField }) => (
                      <input
                        type="hidden"
                        name={idField.name}
                        ref={idField.ref}
                        value={idField.value ?? ""}
                        onBlur={idField.onBlur}
                        onChange={(e) => {
                          const raw = e.target.value;
                          idField.onChange(
                            raw === "" ? undefined : Number(raw),
                          );
                        }}
                      />
                    )}
                  />
                  <div className="flex items-end gap-3">
                    <div className="text-sm font-medium text-muted-foreground w-14 shrink-0 pb-2">
                      Pool {index + 1}
                    </div>

                    <FormField
                      control={form.control}
                      name={`planSessionPools.${index}.sessionCount`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormLabel className="text-xs">Sessions</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="h-9 text-center"
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
                      name={`planSessionPools.${index}.isFree`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 pb-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">
                            Free
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex-1" />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground mb-0.5"
                      onClick={() => removePool(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`planSessionPools.${index}.groupIds`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Groups</FormLabel>
                        <FormControl>
                          <PoolGroupPicker
                            groups={groups}
                            value={field.value || []}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
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
    planSessionPools:
      data.planSessionPools?.map((pool) => ({
        ...(pool.id != null && pool.id > 0 ? { id: pool.id } : {}),
        sessionCount: pool.sessionCount,
        isFree: pool.isFree || false,
        groupIds: pool.groupIds,
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
  plan_session_pools?: Array<{
    id: number;
    session_count: number;
    is_free?: boolean;
    plan_session_pool_groups?: Array<{ group_id: number }>;
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
    planSessionPools:
      plan.plan_session_pools?.map((pool) => ({
        id: pool.id,
        sessionCount: pool.session_count,
        isFree: pool.is_free || false,
        groupIds:
          pool.plan_session_pool_groups?.map((m) => m.group_id).filter(Boolean) ||
          [],
      })) || [],
  };
}
