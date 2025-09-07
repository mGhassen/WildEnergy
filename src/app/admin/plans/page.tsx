"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlanSchema, insertPlanGroupSchema } from "@/shared/zod-schemas";
// Removed broken apiRequest imports
import { Plus, Search, Edit, Trash2, Clock, X, Star, Users, Calendar, DollarSign, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/config";

const planFormSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  isActive: z.boolean(),
  planGroups: z.array(z.object({
    groupId: z.number().min(1, 'Group is required'),
    sessionCount: z.number().min(1, 'Session count must be at least 1'),
    isFree: z.boolean(),
  })),
});

type PlanFormData = z.infer<typeof planFormSchema>;

// Use the inferred type from schema
type PlanFormUi = PlanFormData;

export default function AdminPlans() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<any>(null);
  const [linkedSubscriptions, setLinkedSubscriptions] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/plans"],
    queryFn: () => apiFetch("/api/plans"),
  });

  const { data: groups } = useQuery({
    queryKey: ["/api/groups"],
    queryFn: () => apiFetch("/api/groups"),
  });

  const form = useForm<PlanFormUi>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationDays: 30,
      isActive: true,
      planGroups: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "planGroups",
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiFetch("/api/plans", {
        method: "POST",
        body: JSON.stringify(data),
      });
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
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiFetch(`/api/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
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
      await apiFetch(`/api/plans/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setIsDeleteDialogOpen(false);
      setDeletingPlan(null);
      setLinkedSubscriptions([]);
      toast({ title: "Plan deleted successfully" });
    },
    onError: (error: any) => {
      if (error.status === 400 && error.linkedSubscriptions) {
        setLinkedSubscriptions(error.linkedSubscriptions);
        setIsDeleteDialogOpen(true);
      } else {
        toast({ 
          title: "Error deleting plan", 
          description: error.message,
          variant: "destructive" 
        });
      }
    },
  });

  const filteredPlans = Array.isArray(plans) ? plans.filter((plan: any) =>
    `${plan.name} ${plan.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) : [];

  // Map snake_case fields to camelCase for rendering
  const mappedPlans = filteredPlans.map((plan: any) => ({
    ...plan,
    durationDays: plan.duration_days ?? plan.durationDays,
    isActive: plan.is_active ?? plan.isActive,
  }));

  const handleSubmit = (data: PlanFormUi) => {
    // Map camelCase to snake_case for API
    const submitData = {
      name: data.name,
      description: data.description,
      price: Number(data.price),
      duration_days: data.durationDays,
      is_active: data.isActive,
      planGroups: data.planGroups?.map(group => ({
        groupId: group.groupId,
        sessionCount: group.sessionCount,
        isFree: group.isFree || false,
      })) || [],
    };
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data: submitData });
    } else {
      createPlanMutation.mutate(submitData);
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      durationDays: plan.duration_days ?? plan.durationDays,
      isActive: plan.is_active ?? plan.isActive,
      planGroups: plan.plan_groups?.map((group: any) => ({
        groupId: group.group_id,
        sessionCount: group.session_count,
        isFree: group.is_free || false,
      })) || [],
    });
    setIsModalOpen(true);
  };

  const checkDeletion = async (planId: number) => {
    try {
      const response = await apiFetch(`/api/plans/${planId}/check-deletion`);
      return response;
    } catch (error) {
      console.error('Error checking deletion:', error);
      return { canDelete: false, linkedSubscriptions: [] };
    }
  };

  const handleDelete = async (plan: any) => {
    setDeletingPlan(plan);
    setLinkedSubscriptions([]);
    
    // Check if plan can be deleted
    const deletionCheck = await checkDeletion(plan.id);
    
    if (deletionCheck.canDelete) {
      // Safe to delete - show confirmation
      setIsDeleteDialogOpen(true);
    } else {
      // Has active subscriptions - show error dialog
      setLinkedSubscriptions(deletionCheck.linkedSubscriptions || []);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (deletingPlan) {
      deletePlanMutation.mutate(deletingPlan.id);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    form.reset();
    setIsModalOpen(true);
  };

  const formatPrice = (price: string | number) => {
    return formatCurrency(Number(price));
  };

  const getDurationText = (days: number) => {
    if (days === 30) return "Monthly";
    if (days === 365) return "Yearly";
    if (days === 90) return "Quarterly";
    if (days === 180) return "Semi-Annual";
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Plans</h1>
          <p className="text-muted-foreground">Manage membership plans and subscriptions</p>
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
                        <Textarea {...field} placeholder="Brief description..." rows={2} />
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
                            onChange={e => field.onChange(Number(e.target.value))}
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
                          <FormLabel className="text-sm">
                            Active plan
                          </FormLabel>
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
                            { label: "1 Year", value: 365, description: "365 days" }
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
                            onChange={e => field.onChange(Number(e.target.value))}
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
                      onClick={() => append({ groupId: 0, sessionCount: 1, isFree: false })}
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
                              <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select group" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {groups?.map((group: any) => (
                                    <SelectItem key={group.id} value={group.id.toString()}>
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
                                  onChange={e => field.onChange(Number(e.target.value))}
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
                      No groups added yet. Click "Add Group" to include groups in this plan.
                    </div>
                  )}
                </div>


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
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Plans Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All Plans</h2>
            <p className="text-sm text-muted-foreground">
              {filteredPlans.length} of {mappedPlans.length} plans
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-full"></div>
                    <div className="h-10 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mappedPlans.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Plans Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first membership plan to start offering subscriptions.
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mappedPlans.map((plan: any) => (
              <Card key={plan.id} className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full flex flex-col">
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Header with Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {plan.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base text-foreground mb-1 truncate">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                          {plan.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={plan.isActive ? 'default' : 'secondary'}
                      className={`${plan.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''} flex-shrink-0 ml-2`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Price Section */}
                  <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-primary mb-1">
                          {formatPrice(plan.price)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per {getDurationText(plan.durationDays).toLowerCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {plan.durationDays} days
                        </div>
                        <div className="text-xs text-muted-foreground">
                          duration
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Groups Section - Fixed Height */}
                  <div className="mb-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Included Groups
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {plan.plan_groups?.length || 0}
                      </Badge>
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto">
                      {plan.plan_groups && plan.plan_groups.length > 0 ? (
                        <div className="space-y-1">
                          {plan.plan_groups.map((group: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-md border text-xs">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0" 
                                  style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                                />
                                <span className="text-sm font-medium text-foreground truncate">
                                  {group.groups?.name || 'Unknown Group'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                <span className="text-xs text-muted-foreground">
                                  {group.session_count}s
                                </span>
                                {group.is_free && (
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200 px-1 py-0">
                                    FREE
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                          No groups included
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions - Always at bottom */}
                  <div className="flex space-x-2 pt-2 border-t mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Plan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan)}
                      className="hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              {linkedSubscriptions.length > 0 ? "Cannot Delete Plan" : "Delete Plan"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {linkedSubscriptions.length > 0 ? (
                <>
                  The plan <span className="font-medium text-foreground">"{deletingPlan?.name}"</span> cannot be deleted because it has active subscriptions.
                </>
              ) : (
                <>
                  Are you sure you want to delete the plan <span className="font-medium text-foreground">"{deletingPlan?.name}"</span>? 
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {linkedSubscriptions.length > 0 && (
            <div className="mt-6 p-5 bg-destructive/50 border-l-4 border-destructive rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-destructive"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground mb-2">
                    Cannot Delete Plan
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    This plan is currently being used by the following subscriptions and cannot be deleted:
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {linkedSubscriptions.map((sub, index) => (
                      <div key={sub.id} className="flex items-center gap-3 p-2 bg-background/80 rounded-md border border-destructive/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0"></div>
                        <span className="text-sm font-medium text-foreground">
                          {sub.users?.first_name} {sub.users?.last_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {sub.users?.email}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex items-center">
                    <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground mr-2"></span>
                    Cancel or transfer these subscriptions first
                  </div>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingPlan(null);
                setLinkedSubscriptions([]);
              }}
              className="flex-1"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={`flex-1 ${
                linkedSubscriptions.length > 0 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
              disabled={linkedSubscriptions.length > 0 || deletePlanMutation.isPending}
            >
              {linkedSubscriptions.length > 0 ? 'Cannot Delete' : (deletePlanMutation.isPending ? 'Deleting...' : 'Delete Plan')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
