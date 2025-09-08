"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGroupSchema } from "@/shared/zod-schemas";
import { Plus, Search, Edit, Trash2, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useCheckGroupDeletion } from "@/hooks/useGroups";
import { useCategories } from "@/hooks/useCategories";

const groupFormSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean(),
  categoryIds: z.array(z.number()).optional(),
});

type GroupFormData = z.infer<typeof groupFormSchema>;

export default function AdminGroups() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingGroup, setDeletingGroup] = useState<any>(null);
  const [linkedPlans, setLinkedPlans] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  const { data: groups, isLoading } = useGroups();
  const { data: categories } = useCategories();

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#4ECDC4",
      isActive: true,
      categoryIds: [],
    },
  });

  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const checkDeletionMutation = useCheckGroupDeletion();

  // Handle success for create and update mutations
  if (createGroupMutation.isSuccess) {
    setIsModalOpen(false);
    form.reset();
    createGroupMutation.reset();
  }

  if (updateGroupMutation.isSuccess) {
    setIsModalOpen(false);
    setEditingGroup(null);
    form.reset();
    updateGroupMutation.reset();
  }

  if (deleteGroupMutation.isSuccess) {
    setDeletingGroup(null);
    setLinkedPlans([]);
    deleteGroupMutation.reset();
  }

  const filteredGroups = Array.isArray(groups) ? groups.filter((group: any) =>
    `${group.name} ${group.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) : [];

  const handleSubmit = (data: GroupFormData) => {
    const submitData = {
      name: data.name,
      description: data.description,
      color: data.color,
      is_active: data.isActive,
      categoryIds: data.categoryIds || [],
    };
    if (editingGroup) {
      updateGroupMutation.mutate({ groupId: editingGroup.id, data: submitData });
    } else {
      createGroupMutation.mutate(submitData);
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    form.reset({
      name: group.name,
      description: group.description,
      color: group.color,
      isActive: group.is_active ?? group.isActive,
      categoryIds: group.categories?.map((cat: any) => cat.id) || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (group: any) => {
    setDeletingGroup(group);
    setLinkedPlans([]); // Clear any previous error state
    
    // Check if group is used in plans before showing dialog
    checkDeletionMutation.mutate(group.id, {
      onSuccess: (response) => {
        if (response.canDelete) {
          setLinkedPlans([]);
        } else {
          setLinkedPlans(response.linkedPlans || []);
        }
        setIsDeleteDialogOpen(true);
      },
      onError: (error: any) => {
        console.error('Error checking group deletion:', error);
        setLinkedPlans([]);
        setIsDeleteDialogOpen(true);
      }
    });
  };

  const confirmDelete = () => {
    if (deletingGroup) {
      deleteGroupMutation.mutate(deletingGroup.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    form.reset();
    setIsModalOpen(true);
  };

  const navigateToPlans = () => {
    router.push('/admin/plans');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Groups</h1>
          <p className="text-muted-foreground">Manage category groups</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Edit Group" : "Add New Group"}</DialogTitle>
              <DialogDescription>
                {editingGroup ? "Update group information" : "Add a new category group"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Fitness Basics" />
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
                        <Textarea {...field} placeholder="Brief description of the group..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input type="color" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categories</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const categoryId = Number(value);
                          const currentIds = field.value || [];
                          if (!currentIds.includes(categoryId)) {
                            field.onChange([...currentIds, categoryId]);
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select categories to add" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.filter((cat: any) => !field.value?.includes(cat.id)).map((category: any) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {field.value.map((categoryId: number) => {
                            const category = categories?.find((cat: any) => cat.id === categoryId);
                            return (
                              <div key={categoryId} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-sm">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: category?.color }}
                                />
                                {category?.name}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                  onClick={() => {
                                    field.onChange(field.value?.filter((id: number) => id !== categoryId));
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createGroupMutation.isPending || updateGroupMutation.isPending}>
                    {editingGroup ? "Update Group" : "Create Group"}
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
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Groups</CardTitle>
          <CardDescription>
            {filteredGroups.length} of {groups?.length || 0} groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
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
                  <TableHead>Group</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group: any) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: group.color + '20', color: group.color }}
                        >
                          <span className="text-xs font-medium">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{group.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {group.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.categories && group.categories.length > 0 ? (
                          group.categories.map((category: any, index: number) => (
                            <div key={index} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No categories</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.is_active ? 'default' : 'secondary'}>
                        {group.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(group)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(group)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              {linkedPlans.length > 0 ? 'Cannot Delete Group' : 'Delete Group'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {linkedPlans.length > 0 ? (
                <>
                  The group <span className="font-medium text-foreground">"{deletingGroup?.name}"</span> cannot be deleted because it's currently used in plans.
                </>
              ) : (
                <>
                  Are you sure you want to delete the group <span className="font-medium text-foreground">"{deletingGroup?.name}"</span>? 
                  This will unlink all categories from this group but will not delete the categories themselves.
                </>
              )}
            </AlertDialogDescription>
            {deletingGroup?.categories && deletingGroup.categories.length > 0 && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
                <div className="font-medium text-sm text-foreground mb-2">Categories that will be unlinked:</div>
                <div className="flex flex-wrap gap-2">
                  {deletingGroup.categories.map((category: any, index: number) => (
                    <span key={index} className="inline-flex items-center gap-1 text-xs bg-background border px-2 py-1 rounded-md">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: category.color || '#6B7280' }}
                      />
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {linkedPlans.length > 0 && (
              <div className="mt-6 p-5 bg-destructive/50 border-l-4 border-destructive rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-destructive"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-foreground mb-2">
                      Cannot Delete Group
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      This group is currently being used in the following plans and cannot be deleted:
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      {linkedPlans.map((planName, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-background/80 rounded-md border border-destructive/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0"></div>
                          <span className="text-sm font-medium text-foreground">{planName}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-foreground border-destructive/30 hover:bg-destructive/5 hover:border-destructive/50 transition-colors"
                        onClick={navigateToPlans}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Go to Plans
                      </Button>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground mr-2"></span>
                        Remove the group from these plans first
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel 
              onClick={() => {
                setDeletingGroup(null);
                setLinkedPlans([]);
                setIsDeleteDialogOpen(false);
              }}
              className="flex-1"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={`flex-1 ${
                linkedPlans.length > 0 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
              disabled={linkedPlans.length > 0}
            >
              {linkedPlans.length > 0 ? 'Cannot Delete' : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
