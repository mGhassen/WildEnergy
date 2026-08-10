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
import { z } from "zod";

export const trainerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  profileEmail: z.union([z.string().email("Invalid email format"), z.literal("")]).optional(),
  bio: z.string().optional(),
  status: z.string().optional(),
  specialization: z.string().optional(),
  experience_years: z.number().optional(),
  certification: z.string().optional(),
});

export type TrainerFormData = z.infer<typeof trainerFormSchema>;

export const trainerFormDefaultValues: TrainerFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  profileEmail: "",
  bio: "",
  status: "active",
  specialization: "",
  experience_years: 0,
  certification: "",
};

type TrainerFormProps = {
  form: UseFormReturn<TrainerFormData>;
  onSubmit: (data: TrainerFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  /** When reusing an existing profile, person fields can be locked. */
  personFieldsLocked?: boolean;
};

export function TrainerForm({
  form,
  onSubmit,
  submitLabel,
  isSubmitting,
  personFieldsLocked,
}: TrainerFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={personFieldsLocked} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={personFieldsLocked} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="profileEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  {...field}
                  disabled={personFieldsLocked}
                  placeholder="Optional contact email (not for login)"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input type="tel" {...field} disabled={personFieldsLocked} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Strength, Yoga" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="experience_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experience (years)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={field.value ?? 0}
                    onChange={(e) =>
                      field.onChange(Number(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="certification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certification</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Brief description of the trainer..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function trainerToFormValues(trainer: any): TrainerFormData {
  return {
    firstName: trainer.first_name || trainer.firstName || "",
    lastName: trainer.last_name || trainer.lastName || "",
    phone: trainer.phone || "",
    profileEmail: trainer.profile_email || "",
    bio: trainer.bio || "",
    status: trainer.status || "active",
    specialization: trainer.specialization || "",
    experience_years: trainer.experience_years ?? 0,
    certification: trainer.certification || "",
  };
}

export function toCreateTrainerPayload(
  data: TrainerFormData,
  profileId?: string,
) {
  if (profileId) {
    return {
      profileId,
      specialization: data.specialization,
      experienceYears: data.experience_years,
      bio: data.bio,
      certification: data.certification,
      status: data.status,
    };
  }
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    profileEmail: data.profileEmail || undefined,
    specialization: data.specialization,
    experienceYears: data.experience_years,
    bio: data.bio,
    certification: data.certification,
    status: data.status,
  };
}

export function toUpdateTrainerPayload(
  data: TrainerFormData,
  trainer: { id: string; account_id?: string | null },
) {
  return {
    trainerId: trainer.id,
    accountId: trainer.account_id || undefined,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    profileEmail: data.profileEmail || undefined,
    specialization: data.specialization,
    experienceYears: data.experience_years,
    bio: data.bio,
    certification: data.certification,
    status: data.status,
  };
}
