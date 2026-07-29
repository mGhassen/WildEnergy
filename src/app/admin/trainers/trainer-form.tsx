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
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  specialties: z.array(z.string()).optional(),
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
  email: "",
  phone: "",
  bio: "",
  status: "active",
};

type TrainerFormProps = {
  form: UseFormReturn<TrainerFormData>;
  onSubmit: (data: TrainerFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
};

export function TrainerForm({
  form,
  onSubmit,
  submitLabel,
  isSubmitting,
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
                  <Input {...field} />
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
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
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
                <Input type="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
    email: trainer.email || "",
    phone: trainer.phone || "",
    bio: trainer.bio || "",
    status: trainer.status || "active",
    specialization: trainer.specialization || "",
    experience_years: trainer.experience_years,
    certification: trainer.certification || "",
  };
}

export function toCreateTrainerPayload(data: TrainerFormData) {
  return {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    bio: data.bio,
    specialization: data.specialization,
    experienceYears: data.experience_years,
    certification: data.certification,
  };
}

export function toUpdateTrainerPayload(
  data: TrainerFormData,
  trainer: { id: string; account_id?: string },
) {
  return {
    trainerId: trainer.id,
    accountId: trainer.account_id || "",
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    specialization: data.specialization,
    experienceYears: data.experience_years,
    bio: data.bio,
    certification: data.certification,
    status: data.status,
  };
}
