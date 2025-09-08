"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrainerSchema } from "@/shared/zod-schemas";
import { useTrainers, useCreateTrainer, useUpdateTrainer, useDeleteTrainer } from "@/hooks/useTrainers";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { TableSkeleton, FormSkeleton } from "@/components/skeletons";

const trainerFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  bio: z.string().optional(),
  status: z.string().optional(),
  specialization: z.string().optional(),
  experience_years: z.number().optional(),
  certification: z.string().optional(),
});

type TrainerFormData = z.infer<typeof trainerFormSchema>;

export default function AdminTrainers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: trainersData = [], isLoading } = useTrainers();
  
  // Filter trainers based on search term
  const filteredTrainers = trainersData.filter((trainer: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (trainer.first_name?.toLowerCase().includes(search) ||
      trainer.last_name?.toLowerCase().includes(search) ||
      trainer.email?.toLowerCase().includes(search) ||
      trainer.phone?.includes(search))
    );
  });

  const form = useForm<TrainerFormData>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      bio: "",
      status: "active",
    },
  });

  const createTrainerMutation = useCreateTrainer();

  const updateTrainerMutation = useUpdateTrainer();

  const deleteTrainerMutation = useDeleteTrainer();

  // Filtering is now handled above with the transformed data

  const handleSubmit = (data: TrainerFormData) => {
    if (editingTrainer) {
      updateTrainerMutation.mutate({ 
        trainerId: editingTrainer.id, 
        data: {
          ...data,
          user_id: editingTrainer.user_id
        }
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingTrainer(null);
          form.reset();
        }
      });
    } else {
      createTrainerMutation.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingTrainer(null);
          form.reset();
        }
      });
    }
  };

  const handleEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    form.reset({
      firstName: trainer.first_name,
      lastName: trainer.last_name,
      email: trainer.email,
      phone: trainer.phone,
      bio: trainer.bio,
      status: trainer.status,
      specialization: trainer.specialization,
      experience_years: trainer.experience_years,
      certification: trainer.certification,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (trainer: any) => {
    if (confirm("Are you sure you want to delete this trainer?")) {
      deleteTrainerMutation.mutate(trainer.user_id);
    }
  };

  const openCreateModal = () => {
    setEditingTrainer(null);
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      bio: "",
      status: "active",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 mt-2 md:mt-6"> {/* Added top margin for alignment with logo/top bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Trainers</h1>
          <p className="text-muted-foreground">Manage gym trainers and their information</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Trainer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTrainer ? "Edit Trainer" : "Add New Trainer"}</DialogTitle>
              <DialogDescription>
                {editingTrainer ? "Update trainer information" : "Add a new trainer to the gym"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                        <Textarea {...field} placeholder="Brief description of the trainer..." />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createTrainerMutation.isPending || updateTrainerMutation.isPending}>
                    {editingTrainer ? "Update Trainer" : "Create Trainer"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search trainers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Trainers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Trainers</CardTitle>
          <CardDescription>
            {filteredTrainers.length} of {trainersData.length} trainers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainers.map((trainer: any) => (
                  <TableRow key={trainer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {getInitials(trainer.first_name, trainer.last_name)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {trainer.first_name} {trainer.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trainer.specialization}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{trainer.email}</p>
                        <p className="text-xs text-muted-foreground">{trainer.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={trainer.status === "active" ? "default" : "secondary"}>
                        {trainer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(trainer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDelete(trainer)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
