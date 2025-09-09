"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useAdminClasses } from "@/hooks/useAdmin";
import { TableSkeleton, FormSkeleton } from "@/components/skeletons";
import { Category } from "@/lib/api/categories";
import { AdminClass } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean(),
  groupId: z.union([z.number(), z.null()]).optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryWithUI extends Category {
  isActive: boolean;
}


export default function AdminCategories() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithUI | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithUI | null>(null);
  const [linkedClasses, setLinkedClasses] = useState<any[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: rawCategories = [], isLoading, refetch } = useCategories();

  console.log('Raw categories from API:', rawCategories);
  console.log('Query loading state:', isLoading);

  // Map is_active (from API) to isActive (for UI)
  const categories: CategoryWithUI[] = (rawCategories || []).map((cat: Category) => ({
    ...cat,
    isActive: cat.is_active,
  }));

  console.log('Transformed categories:', categories);

  const { data: classes = [] } = useAdminClasses();

  const { data: groups = [] } = useGroups();

  const getClassCount = (categoryId: number) =>
    classes.filter((cls: AdminClass) => cls.category_id === categoryId).length;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#4ECDC4",
      isActive: true,
      groupId: null,
    },
  });

  const createMutation = useCreateCategory();

  const updateMutation = useUpdateCategory();

  const deleteMutation = useDeleteCategory();

  const onSubmit = (data: CategoryFormData) => {
    console.log('Form submitted:', { data, editingCategory });
    console.log('groupId in form data:', data.groupId, 'type:', typeof data.groupId);
    console.log('Form values:', form.getValues());
    
    if (editingCategory) {
      console.log('Calling update mutation with:', { categoryId: editingCategory.id, data });
      updateMutation.mutate({ categoryId: editingCategory.id, data }, {
        onSuccess: () => {
          console.log('Update successful');
          setIsCreateDialogOpen(false);
          setEditingCategory(null);
          form.reset();
        },
        onError: (error) => {
          console.error('Update error:', error);
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          console.log('Create successful');
          setIsCreateDialogOpen(false);
          setEditingCategory(null);
          form.reset();
        }
      });
    }
  };

  const handleEdit = (category: CategoryWithUI) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      color: category.color || "",
      isActive: category.isActive,
      groupId: (category as any).group_id ?? null,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (category: CategoryWithUI) => {
    setDeletingCategory(category);
    
    // Check if category has linked classes
    const linkedClassesForCategory = classes.filter((cls: AdminClass) => cls.category_id === category.id);
    setLinkedClasses(linkedClassesForCategory);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingCategory) {
      console.log('Attempting to delete category with ID:', deletingCategory.id);
      deleteMutation.mutate(deletingCategory.id, {
        onSuccess: () => {
          console.log('Category deleted successfully');
          setIsDeleteDialogOpen(false);
          setDeletingCategory(null);
          setLinkedClasses([]);
        },
        onError: (error: any) => {
          console.error('Delete category error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            data: error.data,
            classes: error.classes
          });
          
          // Show detailed error message with classes that are using this category
          if (error.status === 400 && error.classes && error.classes.length > 0) {
            const classNames = error.classes.map((cls: any) => cls.name).join(', ');
            toast({
              title: "Cannot delete category",
              description: `This category is being used by the following classes: ${classNames}. Please reassign or delete these classes first.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: error.message || "Failed to delete category",
              variant: "destructive",
            });
          }
        }
      });
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      color: "#4ECDC4",
      isActive: true,
      groupId: null,
    });
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Categories</h1>
          <p className="text-muted-foreground">Manage categories for your gym classes</p>
        </div>
        <Dialog open={isCreateDialogOpen || !!editingCategory} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingCategory(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create New Category"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter category name" {...field} />
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
                        <Textarea
                          placeholder="Enter category description"
                          {...field}
                          value={field.value || ""}
                        />
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
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            className="w-12 h-10 p-1 rounded border"
                            {...field}
                            value={field.value || "#3b82f6"}
                          />
                          <Input
                            placeholder="#3b82f6"
                            {...field}
                            value={field.value || ""}
                            className="flex-1"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          console.log('Select onValueChange:', value, 'current field.value:', field.value);
                          if (value === "none") {
                            console.log('Setting groupId to null');
                            field.onChange(null);
                          } else {
                            console.log('Setting groupId to:', Number(value));
                            field.onChange(Number(value));
                          }
                          console.log('Field value after change:', field.value);
                        }} 
                        value={field.value === null || field.value === undefined ? "none" : field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a group (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No group</SelectItem>
                          {groups.map((group: any) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: group.color }}
                                />
                                {group.name}
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
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Category is available for use
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingCategory(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the category &quot;{deletingCategory?.name}&quot;?
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {linkedClasses.length > 0 && (
              <div className="my-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="text-amber-800 dark:text-amber-200 font-medium">
                  ⚠️ This category is currently used by {linkedClasses.length} class{linkedClasses.length !== 1 ? 'es' : ''}:
                </div>
                <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  {linkedClasses.map((cls: AdminClass) => (
                    <li key={cls.id}>• {cls.name}</li>
                  ))}
                </ul>
                <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  <strong>Deletion will be blocked</strong> to maintain data integrity. Please reassign or delete these classes first.
                </div>
              </div>
            )}
            <AlertDialogDescription className="mt-4">
              This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingCategory(null);
                setLinkedClasses([]);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className={linkedClasses.length > 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}
                disabled={linkedClasses.length > 0}
              >
                {linkedClasses.length > 0 ? "Cannot Delete (Has Classes)" : "Delete Category"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Classes Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category: CategoryWithUI) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category.color || '#94a3b8' }}
                      >
                        <span className="text-xs font-medium text-white">
                          {category.name?.charAt(0)?.toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div className="flex-1">
                        {/* Group name with colored text */}
                        {category.groups && (
                          <div className="mb-1">
                            <span 
                              className="text-xs font-medium"
                              style={{ color: category.groups.color || '#94a3b8' }}
                            >
                              {category.groups.name}
                            </span>
                          </div>
                        )}
                        <p className="font-medium text-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {category.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getClassCount(category.id)} classes
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Create your first category to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}