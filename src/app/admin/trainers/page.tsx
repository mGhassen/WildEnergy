"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useTrainers, useDeleteTrainer } from "@/hooks/useTrainers";
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
import { TableSkeleton } from "@/components/skeletons";


export default function AdminTrainers() {
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

  const deleteTrainerMutation = useDeleteTrainer();

  // Filtering is now handled above with the transformed data



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
    router.push("/admin/trainers/new");
  };

  return (
    <div className="space-y-8 mt-2 md:mt-6"> {/* Added top margin for alignment with logo/top bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Trainers</h1>
          <p className="text-muted-foreground">Manage gym trainers and their information</p>
        </div>
        <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add Trainer
          </Button>


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
                            router.push(`/admin/trainers/${trainer.id}/edit`);
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
