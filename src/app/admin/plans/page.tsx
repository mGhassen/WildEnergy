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
import { Plus, Search, Edit, Trash2, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiFetch } from "@/lib/api";

const planFormSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  maxSessions: z.number().min(1, 'Must allow at least 1 session'),
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
      maxSessions: 1,
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
    maxSessions: plan.max_sessions ?? plan.maxSessions,
    isActive: plan.is_active ?? plan.isActive,
  }));

  const handleSubmit = (data: PlanFormUi) => {
    // Map camelCase to snake_case for API
    const submitData = {
      name: data.name,
      description: data.description,
      price: Number(data.price),
      duration_days: data.durationDays,
      max_sessions: data.maxSessions,
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
      maxSessions: plan.max_sessions ?? plan.maxSessions,
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
    return `${Number(price).toFixed(2)} TND`;
  };

  const getDurationText = (days: number) => {
    if (days === 30) return "Monthly";
    if (days === 365) return "Yearly";
    if (days === 90) return "Quarterly";
    if (days === 180) return "Semi-Annual";
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
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl">{editingPlan ? "Edit Plan" : "New Plan"}</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
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
                </div>

                {/* Pricing & Duration */}
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
                    name="maxSessions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Sessions</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                            placeholder="12"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duration Quick Select */}
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <div className="flex gap-2">
                        {[
                          { label: "1M", value: 30 },
                          { label: "3M", value: 90 },
                          { label: "6M", value: 180 },
                          { label: "1Y", value: 365 }
                        ].map(({ label, value }) => (
                          <Button
                            key={value}
                            type="button"
                            variant={field.value === value ? "default" : "outline"}
                            size="sm"
                            onClick={() => field.onChange(value)}
                            className="flex-1"
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Plan Groups */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-primary rounded-full"></div>
                      <FormLabel className="text-base font-semibold text-foreground">Plan Groups</FormLabel>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ groupId: 0, sessionCount: 1, isFree: false })}
                      className="h-9 px-3"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Group
                    </Button>
                  </div>
                  
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2 h-10 w-10 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {fields.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-muted/50 rounded-lg bg-muted/10">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        No groups added yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "Add" to include groups in this plan
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Status */}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">
                        Active plan
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
                    {editingPlan ? "Update" : "Create"}
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
          mappedPlans.map((plan: any) => (
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
                      <span className="text-sm text-muted-foreground">Max Sessions:</span>
                      <span className="font-medium">{plan.maxSessions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{getDurationText(plan.durationDays)}</span>
                      </div>
                    </div>
                    
                    {/* Plan Groups Display */}
                    {plan.plan_groups && plan.plan_groups.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary rounded-full"></div>
                          <span className="text-sm font-medium text-foreground">Included Groups</span>
                        </div>
                        <div className="space-y-2">
                          {plan.plan_groups.map((group: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/50">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full shadow-sm border border-white/20" 
                                  style={{ backgroundColor: group.groups?.color || '#6B7280' }}
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-foreground">
                                    {group.groups?.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {group.session_count} session{group.session_count > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                              {group.is_free && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-semibold border border-green-200 dark:border-green-800">
                                    FREE
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                      onClick={() => handleDelete(plan)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {linkedSubscriptions.length > 0 ? "Cannot Delete Plan" : "Delete Plan"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="py-4">
            {linkedSubscriptions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-base text-foreground">This plan cannot be deleted because it has active subscriptions.</p>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <span className="font-medium text-destructive">
                      {linkedSubscriptions.length} Active Subscription{linkedSubscriptions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-foreground">
                    {linkedSubscriptions.map((sub, index) => (
                      <div key={sub.id} className="flex items-center justify-between">
                        <span>
                          {sub.users?.first_name} {sub.users?.last_name}
                        </span>
                        <span className="text-muted-foreground">
                          {sub.users?.email}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-foreground mt-2">
                    Please cancel or transfer these subscriptions before deleting the plan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-base text-foreground">Are you sure you want to delete the plan <strong>"{deletingPlan?.name}"</strong>?</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. All plan groups will also be deleted.
                </p>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeletingPlan(null);
              setLinkedSubscriptions([]);
            }}>
              {linkedSubscriptions.length > 0 ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {linkedSubscriptions.length === 0 && (
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deletePlanMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
