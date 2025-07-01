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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Calendar, DollarSign } from "lucide-react";
import { getInitials, formatDate } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const subscriptionFormSchema = insertSubscriptionSchema.extend({
  planId: z.string().transform((val) => parseInt(val)),
}).omit({ userId: true }).extend({
  memberId: z.string().min(1, "Member is required"),
});
type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function AdminSubscriptions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["/api/subscriptions"],
  });

  const { data: members } = useQuery({
    queryKey: ["/api/members"],
  });

  const { data: plans } = useQuery({
    queryKey: ["/api/plans"],
  });

  const form = useForm<any>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      memberId: "",
      planId: "",
      startDate: new Date(),
      endDate: new Date(),
      sessionsRemaining: 0,
    },
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
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

  const filteredSubscriptions = subscriptions?.filter((subscription: any) =>
    `${subscription.member?.firstName} ${subscription.member?.lastName} ${subscription.plan?.name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = (data: any) => {
    // Validate required fields
    if (!data.memberId || !data.planId) {
      toast({
        title: "Validation Error",
        description: "Please select both member and plan",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate end date based on plan duration
    const selectedPlan = plans?.find((plan: any) => plan.id === parseInt(data.planId));
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Selected plan not found",
        variant: "destructive"
      });
      return;
    }
    
    const endDate = new Date(data.startDate);
    endDate.setDate(endDate.getDate() + selectedPlan.durationDays);
    
    // Convert to the correct format for the API
    const submitData = {
      userId: data.memberId,
      planId: selectedPlan.id,
      startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
      endDate: endDate.toISOString(),
      sessionsRemaining: selectedPlan.sessionsIncluded,
      status: 'active',
      paymentStatus: 'pending'
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

  const getStatusColor = (subscription: any) => {
    if (!subscription.isActive) return "secondary";
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (endDate < now) return "destructive";
    return "default";
  };

  const getStatusText = (subscription: any) => {
    if (!subscription.isActive) return "Inactive";
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    if (endDate < now) return "Expired";
    return "Active";
  };

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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Subscription</DialogTitle>
              <DialogDescription>
                Create a new subscription for a member
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="memberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value)} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members?.filter((member: any) => member.status === 'active').map((member: any) => (
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
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value)} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans?.map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.id.toString()}>
                              {plan.name} - {formatPrice(plan.price)} ({plan.sessionsIncluded} sessions)
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
                          {...field} 
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createSubscriptionMutation.isPending}

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
            {filteredSubscriptions.length} of {subscriptions?.length || 0} subscriptions
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
                  <TableHead>Duration</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription: any) => (
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
                      <p className="text-sm text-muted-foreground">{subscription.plan?.sessionsIncluded} sessions included</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-1 text-muted-foreground" />
                          {formatDate(subscription.startDate)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          to {formatDate(subscription.endDate)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <p className="font-medium text-foreground">{subscription.sessionsRemaining}</p>
                        <p className="text-xs text-muted-foreground">remaining</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(subscription)}>
                        {getStatusText(subscription)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span className="font-medium">{formatPrice(subscription.plan?.price || 0)}</span>
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
