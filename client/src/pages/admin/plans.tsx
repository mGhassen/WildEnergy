import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlanSchema } from "@shared/schema";
// Removed broken apiRequest imports
import { Plus, Search, Edit, Trash2, DollarSign, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const planFormSchema = insertPlanSchema;
type PlanFormData = z.infer<typeof planFormSchema>;

export default function AdminPlans() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/plans"],
  });

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "0",
      sessionsIncluded: 0,
      durationDays: 30,
      isActive: true,
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Plan created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating plan", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PlanFormData> }) => {
      const response = await fetch(`/api/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsModalOpen(false);
      setEditingPlan(null);
      form.reset();
      toast({ title: "Plan updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating plan", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting plan", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const filteredPlans = plans?.filter((plan: any) =>
    `${plan.name} ${plan.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      sessionsIncluded: plan.sessionsIncluded,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      deletePlanMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    form.reset();
    setIsModalOpen(true);
  };

  const formatPrice = (price: string | number) => {
    return `${Number(price).toFixed(2)} TND`;
  };

  const getDurationText = (days: number) => {
    if (days === 30) return "Monthly";
    if (days === 365) return "Yearly";
    if (days === 7) return "Weekly";
    return `${days} days`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Plans</h1>
          <p className="text-muted-foreground">Manage membership plans and pricing</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
              <DialogDescription>
                {editingPlan ? "Update plan information" : "Add a new membership plan"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                        <Textarea {...field} placeholder="Brief description of the plan..." />
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
                            placeholder="49.99"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sessionsIncluded"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sessions Included</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            placeholder="12"
                          />
                        </FormControl>
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
                      <FormLabel>Duration (Days)</FormLabel>
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(30)}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            1 Month
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(90)}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            3 Months
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(180)}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            6 Months
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange(365)}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            1 Year
                          </Button>
                        </div>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            placeholder="30"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
                    {editingPlan ? "Update Plan" : "Create Plan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-full"></div>
                  <div className="h-10 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredPlans.map((plan: any) => (
            <Card key={plan.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-3xl font-bold text-primary">
                          {formatPrice(plan.price)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        per {getDurationText(plan.durationDays).toLowerCase()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sessions included:</span>
                      <span className="font-medium">{plan.sessionsIncluded}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{getDurationText(plan.durationDays)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
