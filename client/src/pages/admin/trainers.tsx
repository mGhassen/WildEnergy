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
import { insertTrainerSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { getInitials } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const trainerFormSchema = insertTrainerSchema;

type TrainerFormData = z.infer<typeof trainerFormSchema>;

export default function AdminTrainers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: trainersData = [], isLoading } = useQuery({
    queryKey: ["trainers"],
    queryFn: async () => {
      try {
        const data = await apiRequest("GET", "/api/trainers");
        
        // Transform the data to match the expected structure
        return data.map((trainer: any) => ({
          ...trainer,
          // If user data is nested, flatten it
          ...(trainer.user ? {
            firstName: trainer.user.firstName || trainer.user.first_name,
            lastName: trainer.user.lastName || trainer.user.last_name,
            email: trainer.user.email,
            phone: trainer.user.phone
          } : {})
        }));
      } catch (err) {
        console.error('Error fetching trainers:', err);
        toast({
          title: "Error",
          description: "Failed to load trainers. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Filter trainers based on search term
  const filteredTrainers = trainersData.filter((trainer: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (trainer.firstName?.toLowerCase().includes(search) ||
      trainer.lastName?.toLowerCase().includes(search) ||
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

  const createTrainerMutation = useMutation({
    mutationFn: async (data: TrainerFormData) => {
      const response = await apiRequest("POST", "/api/trainers", data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      setIsModalOpen(false);
      form.reset();
      toast({ 
        title: "Trainer created successfully",
        description: `${data.trainer.firstName} ${data.trainer.lastName} has been added.`
      });
      // The page will automatically refresh the trainers list due to the query invalidation
    },
    onError: (error) => {
      toast({ 
        title: "Error creating trainer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateTrainerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TrainerFormData> }) => {
      const response = await apiRequest("PUT", `/api/trainers/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      setIsModalOpen(false);
      setEditingTrainer(null);
      form.reset();
      toast({ title: "Trainer updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating trainer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteTrainerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/trainers/${id}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast({ title: "Trainer deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting trainer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Filtering is now handled above with the transformed data

  const handleSubmit = (data: TrainerFormData) => {
    if (editingTrainer) {
      updateTrainerMutation.mutate({ id: editingTrainer.id, data });
    } else {
      createTrainerMutation.mutate(data);
    }
  };

  const handleEdit = (trainer: any) => {
    setEditingTrainer(trainer);
    form.reset({
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      phone: trainer.phone,
      bio: trainer.bio,
      status: trainer.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this trainer?")) {
      deleteTrainerMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingTrainer(null);
    form.reset();
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
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
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
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
                        <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-secondary">
                            {getInitials(trainer.firstName, trainer.lastName)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {trainer.firstName} {trainer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">ID: #{trainer.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{trainer.email}</p>
                        {trainer.phone && (
                          <p className="text-sm text-muted-foreground">{trainer.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={trainer.status === 'active' ? 'default' : 'secondary'}
                      >
                        {trainer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(trainer)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(trainer.id)}
                        >
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
