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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Calendar, DollarSign } from "lucide-react";
import { getInitials, formatDate } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Type definitions

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

type Plan = {
  id: number;
  name: string;
  price: number;
  sessionsIncluded: number;
  durationDays: number;
  duration: number; // Added for the new duration display
};

type Subscription = {
  id: number;
  member: Member;
  plan: Plan;
  startDate: string;
  endDate: string;
  sessionsRemaining: number;
  isActive: boolean;
  notes?: string;
  paymentType?: string;
  transactionId?: string;
  amountPaid?: string;
  paymentDate?: string;
  dueDate?: string;
  discount?: string;
  paymentNotes?: string;
  paymentStatus?: string; // Added for payment status
};

const subscriptionFormSchema = z.object({
  userId: z.string().min(1, "Member is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, "Invalid date"),
  notes: z.string().optional(),
  paymentType: z.string().min(1, 'Payment type is required'),
  transactionId: z.string().optional(),
  amountPaid: z.string().optional(),
  paymentDate: z.string().optional(),
  dueDate: z.string().optional(),
  discount: z.string().optional(),
  paymentNotes: z.string().optional(),
  status: z.enum(['active', 'pending', 'cancelled', 'expired']).default('pending'),
});
type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function AdminSubscriptions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/plans"],
  });

  // Map members from snake_case to camelCase for UI
  const mappedMembers = Array.isArray(members)
    ? members.map((m: any) => ({
        ...m,
        firstName: m.firstName || m.first_name || '',
        lastName: m.lastName || m.last_name || '',
        email: m.email,
        status: m.status,
      }))
    : [];

  // Map snake_case fields to camelCase for UI
  const mappedPlans = Array.isArray(plans)
    ? plans.map((plan: any) => ({
        ...plan,
        sessionsIncluded: plan.max_sessions ?? plan.sessionsIncluded ?? 0,
        duration: plan.duration_days ?? plan.duration ?? 0,
      }))
    : [];

  // Debug: log plans and mappedPlans
  console.log('plans', plans);
  console.log('mappedPlans', mappedPlans);

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      userId: "",
      planId: "",
      startDate: new Date().toISOString().split('T')[0],
      notes: "",
      paymentType: "cash",
      transactionId: "",
      amountPaid: "",
      paymentDate: "",
      dueDate: "",
      discount: "",
      paymentNotes: "",
      status: "pending",
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      return await apiRequest("POST", "/api/subscriptions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Subscription created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating subscription", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // After fetching subscriptions, mappedMembers, and plans:
  const mappedSubscriptions = Array.isArray(subscriptions) && Array.isArray(mappedMembers) && Array.isArray(plans)
    ? subscriptions.map((sub: any) => ({
        ...sub,
        member: mappedMembers.find((m: any) => m.id === sub.user_id || m.id === sub.userId) || null,
        plan: plans.find((p: any) => p.id === sub.plan_id || p.id === sub.planId) || null,
      }))
    : [];

  // Debug: log subscriptions and mappedSubscriptions
  console.log('subscriptions', subscriptions);
  console.log('mappedSubscriptions', mappedSubscriptions);

  // Replace filteredSubscriptions with mappedSubscriptions in the table and details dialog
  const filteredSubscriptions = mappedSubscriptions.filter((subscription) =>
    `${subscription.member?.firstName || ''} ${subscription.member?.lastName || ''} ${subscription.plan?.name || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (data: SubscriptionFormData) => {
    if (!data.userId || !data.planId) {
      toast({
        title: "Validation Error",
        description: "Please select both member and plan",
        variant: "destructive"
      });
      return;
    }
    const selectedPlan = mappedPlans.find((plan) => plan.id === parseInt(data.planId));
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Selected plan not found",
        variant: "destructive"
      });
      return;
    }
    if (!data.startDate) {
      toast({
        title: "Validation Error",
        description: "Please select a start date",
        variant: "destructive"
      });
      return;
    }
    // Calculate end date by adding plan duration (in days) to start date
    const startDateObj = new Date(data.startDate);
    startDateObj.setDate(startDateObj.getDate() + Number(selectedPlan.duration));
    const endDateStr = startDateObj.toISOString().split('T')[0];

    const submitData = {
      userId: data.userId,
      planId: data.planId,
      startDate: data.startDate,
      endDate: endDateStr,
      notes: data.notes,
      paymentType: data.paymentType,
      transactionId: data.transactionId,
      amountPaid: data.amountPaid,
      paymentDate: data.paymentDate,
      dueDate: data.dueDate,
      discount: data.discount,
      paymentNotes: data.paymentNotes,
      status: data.status,
    };
    createSubscriptionMutation.mutate(submitData);
  };

  const openCreateModal = () => {
    form.reset();
    setIsModalOpen(true);
  };

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(price));
  };

  const getStatusColor = (subscription: Subscription) => {
    if (!subscription.isActive) return "secondary";
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (endDate < now) return "destructive";
    return "default";
  };

  const getStatusText = (subscription: Subscription) => {
    if (!subscription.isActive) return "Inactive";
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (endDate < now) return "Expired";
    return "Active";
  };

  // Add state for selected subscription and dialog
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Add state for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<any>(null);

  // Edit mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/subscriptions/${editingSubscription?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setIsEditModalOpen(false);
      setShowDetails(false);
      setEditingSubscription(null);
      toast({ title: "Subscription updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating subscription",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Edit form logic (reuse form, but with editingSubscription as default values)
  const openEditModal = (sub: any) => {
    setEditingSubscription(sub);
    form.reset({
      userId: sub.user_id || sub.userId || '',
      planId: (sub.plan_id || sub.planId || '').toString(),
      startDate: sub.start_date ? sub.start_date.split('T')[0] : sub.startDate || '',
      notes: sub.notes || '',
      paymentType: sub.paymentType || '',
      transactionId: sub.transactionId || '',
      amountPaid: sub.amountPaid || '',
      paymentDate: sub.paymentDate ? sub.paymentDate.split('T')[0] : '',
      dueDate: sub.dueDate ? sub.dueDate.split('T')[0] : '',
      discount: sub.discount || '',
      paymentNotes: sub.paymentNotes || '',
      status: sub.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (data: SubscriptionFormData) => {
    // Same logic as handleSubmit, but for update
    const selectedPlan = mappedPlans.find((plan) => plan.id === parseInt(data.planId));
    const startDateObj = new Date(data.startDate);
    startDateObj.setDate(startDateObj.getDate() + Number(selectedPlan?.duration || 0));
    const endDateStr = startDateObj.toISOString().split('T')[0];
    const submitData = {
      userId: data.userId,
      planId: data.planId,
      startDate: data.startDate,
      endDate: endDateStr,
      notes: data.notes,
      paymentType: data.paymentType,
      transactionId: data.transactionId,
      amountPaid: data.amountPaid,
      paymentDate: data.paymentDate,
      dueDate: data.dueDate,
      discount: data.discount,
      paymentNotes: data.paymentNotes,
      status: data.status,
    };
    updateSubscriptionMutation.mutate(submitData);
  };

  // Add loading and empty state guards before rendering the table
  const isLoadingAny = isLoading || !mappedMembers.length || !plans.length;

  if (isLoadingAny) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading subscriptions...</p>
      </div>
    );
  }

  if (!subscriptions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground">No subscriptions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Subscriptions</h1>
          <p className="text-muted-foreground">Manage member subscriptions and payments</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subscription
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Subscription</DialogTitle>
              <DialogDescription>
                Create a new subscription for a member
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Subscription Details */}
                  <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm border">
                    <h3 className="font-bold text-lg mb-2">Subscription Details</h3>
                    <Controller
                      name="userId"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Member</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={val => {
                              field.onChange(val);
                              field.onBlur();
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mappedMembers.filter((member) => member.status === 'active').map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.firstName} {member.lastName} ({member.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                      name="planId"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={val => {
                              field.onChange(val);
                              field.onBlur();
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mappedPlans.map((plan) => (
                                <SelectItem key={plan.id} value={plan.id.toString()}>
                                  {plan.name} - {formatPrice(plan.price)} ({plan.sessionsIncluded || 0} sessions, {plan.duration || 0} days)
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
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value || ''}
                              onChange={e => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Optional notes..."
                              value={field.value || ''}
                              onChange={e => field.onChange(e.target.value)}
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
                          <Select
                            value={field.value}
                            onValueChange={val => {
                              field.onChange(val);
                              field.onBlur();
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Show plan info if selected */}
                    {(() => {
                      const planId = form.watch('planId');
                      if (!planId) {
                        return <div className="text-sm text-muted-foreground border-t pt-2 mt-2">Select a plan to see details.</div>;
                      }
                      const plan = mappedPlans.find((p) => p.id === parseInt(planId));
                      if (!plan) return null;
                      return (
                        <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                          <div>Sessions included: <b>{plan.sessionsIncluded || 0}</b></div>
                          <div>Duration: <b>{plan.duration || 0} days</b></div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Right: Payment Info */}
                  <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm border">
                    <h3 className="font-bold text-lg mb-2">Payment Info</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <FormField
                        control={form.control}
                        name="paymentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Type</FormLabel>
                            <FormControl>
                              <select {...field} className="input w-full">
                                <option value="cash">Cash</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="online">Online</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="transactionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction ID</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Transaction ID (if any)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amountPaid"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount Paid</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Amount paid" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paymentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Date</FormLabel>
                            <FormControl>
                              <Input type="date" placeholder="YYYY-MM-DD" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" placeholder="YYYY-MM-DD" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="discount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="Discount amount" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paymentNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Notes</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Payment-specific notes..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    disabled={createSubscriptionMutation.isPending}
                    className="w-full md:w-auto ml-auto"
                  >
                    {createSubscriptionMutation.isPending ? "Creating..." : "Create Subscription"}
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
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            {filteredSubscriptions.length} of {subscriptions.length} subscriptions
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
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {subscription.member ? getInitials(subscription.member.firstName, subscription.member.lastName) : "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {subscription.member?.firstName} {subscription.member?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{subscription.member?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{subscription.plan?.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(subscription)}>
                        {getStatusText(subscription)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowDetails(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subscription Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>All information for this subscription</DialogDescription>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Member</h4>
                  <div>{selectedSubscription.member?.firstName} {selectedSubscription.member?.lastName}</div>
                  <div className="text-sm text-muted-foreground">{selectedSubscription.member?.email}</div>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Plan</h4>
                  <div>{selectedSubscription.plan?.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedSubscription.plan?.sessionsIncluded} sessions, {selectedSubscription.plan?.duration || selectedSubscription.plan?.durationDays} days</div>
                  <div className="text-sm text-muted-foreground">Price: {formatPrice(selectedSubscription.plan?.price || 0)}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Dates</h4>
                  <div>Start: {formatDate(selectedSubscription.startDate)}</div>
                  <div>End: {formatDate(selectedSubscription.endDate)}</div>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Sessions</h4>
                  <div>Remaining: {selectedSubscription.sessionsRemaining}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Status</h4>
                  <Badge variant={getStatusColor(selectedSubscription)}>
                    {getStatusText(selectedSubscription)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Payment</h4>
                  <div>Status: <Badge variant={selectedSubscription.paymentStatus === 'paid' ? 'default' : selectedSubscription.paymentStatus === 'pending' ? 'secondary' : 'destructive'}>{selectedSubscription.paymentStatus || 'pending'}</Badge></div>
                  <div>Type: {selectedSubscription.paymentType || '-'}</div>
                  <div>Amount Paid: {selectedSubscription.amountPaid || '-'}</div>
                  <div>Transaction ID: {selectedSubscription.transactionId || '-'}</div>
                  <div>Payment Date: {selectedSubscription.paymentDate ? formatDate(selectedSubscription.paymentDate) : '-'}</div>
                  <div>Due Date: {selectedSubscription.dueDate ? formatDate(selectedSubscription.dueDate) : '-'}</div>
                  <div>Discount: {selectedSubscription.discount || '-'}</div>
                </div>
              </div>
              {selectedSubscription.notes && (
                <div>
                  <h4 className="font-semibold mb-1">Notes</h4>
                  <div className="text-muted-foreground text-sm whitespace-pre-wrap">{selectedSubscription.notes}</div>
                </div>
              )}
              {selectedSubscription.paymentNotes && (
                <div>
                  <h4 className="font-semibold mb-1">Payment Notes</h4>
                  <div className="text-muted-foreground text-sm whitespace-pre-wrap">{selectedSubscription.paymentNotes}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            <Button variant="default" onClick={() => openEditModal(selectedSubscription)}>
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>Edit the subscription details below.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Subscription Details */}
                <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm border">
                  <h3 className="font-bold text-lg mb-2">Subscription Details</h3>
                  <Controller
                    name="userId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Member</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={val => {
                            field.onChange(val);
                            field.onBlur();
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mappedMembers.filter((member) => member.status === 'active').map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.firstName} {member.lastName} ({member.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Controller
                    name="planId"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={val => {
                            field.onChange(val);
                            field.onBlur();
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mappedPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.name} - {formatPrice(plan.price)} ({plan.sessionsIncluded || 0} sessions, {plan.duration || 0} days)
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
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Optional notes..."
                            value={field.value || ''}
                            onChange={e => field.onChange(e.target.value)}
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
                        <Select
                          value={field.value}
                          onValueChange={val => {
                            field.onChange(val);
                            field.onBlur();
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Show plan info if selected */}
                  {(() => {
                    const planId = form.watch('planId');
                    if (!planId) {
                      return <div className="text-sm text-muted-foreground border-t pt-2 mt-2">Select a plan to see details.</div>;
                    }
                    const plan = mappedPlans.find((p) => p.id === parseInt(planId));
                    if (!plan) return null;
                    return (
                      <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                        <div>Sessions included: <b>{plan.sessionsIncluded || 0}</b></div>
                        <div>Duration: <b>{plan.duration || 0} days</b></div>
                      </div>
                    );
                  })()}
                </div>
                {/* Right: Payment Info */}
                <div className="space-y-4 bg-card rounded-lg p-4 shadow-sm border">
                  <h3 className="font-bold text-lg mb-2">Payment Info</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <FormField
                      control={form.control}
                      name="paymentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Type</FormLabel>
                          <FormControl>
                            <select {...field} className="input w-full">
                              <option value="cash">Cash</option>
                              <option value="credit_card">Credit Card</option>
                              <option value="bank_transfer">Bank Transfer</option>
                              <option value="online">Online</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="transactionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction ID</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Transaction ID (if any)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amountPaid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Paid</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Amount paid" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Date</FormLabel>
                          <FormControl>
                            <Input type="date" placeholder="YYYY-MM-DD" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" placeholder="YYYY-MM-DD" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Discount amount" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Notes</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Payment-specific notes..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="submit"
                  disabled={updateSubscriptionMutation.isPending}
                  className="w-full md:w-auto ml-auto"
                >
                  {updateSubscriptionMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
