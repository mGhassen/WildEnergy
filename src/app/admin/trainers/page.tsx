"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrainerSchema } from "@/shared/zod-schemas";
import { useTrainers, useCreateTrainer, useUpdateTrainer, useDeleteTrainer } from "@/hooks/useTrainers";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  MoreVertical, 
  Filter, 
  X,
  Users,
  Clock,
  DollarSign,
  Award,
  Link,
  Unlink,
  CheckCircle,
  XCircle
} from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  const { data: trainersData = [], isLoading } = useTrainers();
  
  // Get unique specializations for filter
  const specializations = Array.from(
    new Set(trainersData.map((trainer: any) => trainer.specialization).filter(Boolean))
  );

  // Filter trainers based on search term and filters
  const filteredTrainers = trainersData.filter((trainer: any) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
        trainer.first_name?.toLowerCase().includes(search) ||
        trainer.last_name?.toLowerCase().includes(search) ||
        (trainer.email?.toLowerCase().includes(search) || (!trainer.email && 'unlinked'.includes(search))) ||
        trainer.phone?.includes(search) ||
        trainer.specialization?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== "all" && trainer.status !== statusFilter) {
      return false;
    }

    // Specialization filter
    if (specializationFilter !== "all" && trainer.specialization !== specializationFilter) {
      return false;
    }

    return true;
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
        accountId: editingTrainer.account_id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        specialization: data.specialization,
        experienceYears: data.experience_years,
        bio: data.bio,
        certification: data.certification,
        status: data.status
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
    deleteTrainerMutation.mutate(trainer.account_id, {
      onSuccess: () => {
        toast({
          title: "Trainer deleted",
          description: `${trainer.first_name} ${trainer.last_name} has been deleted successfully.`,
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete trainer",
          variant: "destructive",
        });
      },
    });
  };

  const handleViewTrainer = (trainer: any) => {
    router.push(`/admin/trainers/${trainer.id}`);
  };

  const openAccountDetails = (trainer: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (trainer.account_id) {
      router.push(`/admin/accounts/${trainer.account_id}`);
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

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search trainers by name, email, phone, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {(statusFilter !== "all" || specializationFilter !== "all") && (
              <Badge variant="secondary" className="ml-1">
                {[statusFilter !== "all" ? 1 : 0, specializationFilter !== "all" ? 1 : 0].reduce((a, b) => a + b, 0)}
              </Badge>
            )}
          </Button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specialization</label>
                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All specializations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specializations</SelectItem>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter("all");
                      setSpecializationFilter("all");
                    }}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trainers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Trainers
              </CardTitle>
              <CardDescription>
                {filteredTrainers.length} of {trainersData.length} trainers
                {filteredTrainers.length !== trainersData.length && (
                  <span className="text-muted-foreground ml-2">
                    (filtered)
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : filteredTrainers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No trainers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || specializationFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first trainer"}
              </p>
              {!searchTerm && statusFilter === "all" && specializationFilter === "all" && (
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Trainer
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainers.map((trainer: any) => (
                  <TableRow 
                    key={trainer.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewTrainer(trainer)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {getInitials(trainer.first_name, trainer.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {trainer.first_name} {trainer.last_name}
                            </p>
                            {trainer.account_id ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => openAccountDetails(trainer, e)}
                                className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900"
                                title="View linked account"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                            ) : (
                              <div title="No account linked">
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            ID: {trainer.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">{trainer.email || 'No email (unlinked trainer)'}</p>
                        <p className="text-xs text-muted-foreground">
                          {trainer.phone || 'No phone'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {trainer.specialization || 'Not specified'}
                        </p>
                        {trainer.certification && (
                          <div className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Certified</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">
                            {trainer.experience_years ? `${trainer.experience_years} years` : 'Not specified'}
                          </span>
                        </div>
                        {trainer.hourly_rate && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              ${trainer.hourly_rate}/hr
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={trainer.status === "active" ? "default" : "secondary"}
                        className={
                          trainer.status === "active" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : trainer.status === "suspended"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : ""
                        }
                      >
                        {trainer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewTrainer(trainer);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(trainer);
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(trainer);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
