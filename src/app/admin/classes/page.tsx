"use client";

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
import { insertClassSchema } from "@/shared/zod-schemas";
import { useAdminClasses, useAdminCategories, useAdminRegistrations, useAdminCheckins } from "@/hooks/useAdmin";
import { useCreateAdminClass, useUpdateAdminClass, useDeleteAdminClass } from "@/hooks/useClasses";
import { Plus, Search, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
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

const classFormSchema = insertClassSchema;
type ClassFormData = z.infer<typeof classFormSchema>;

// Helper to map camelCase to snake_case for API
function mapClassToApi(data: any) {
  return {
    name: data.name,
    description: data.description,
    category_id: data.categoryId ? Number(data.categoryId) : null,
    difficulty: data.difficulty,
    duration: data.durationMinutes,
    max_capacity: data.maxCapacity,
    equipment: data.equipment,
    is_active: data.isActive,
  };
}

export default function AdminClasses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [classToDelete, setClassToDelete] = useState<any>(null);
  const [linkedRegistrationsCount, setLinkedRegistrationsCount] = useState<number>(0);
  const [linkedCheckinsCount, setLinkedCheckinsCount] = useState<number>(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawClasses = [], isLoading } = useAdminClasses();
  const { data: rawCategories = [], isLoading: categoriesLoading } = useAdminCategories();
  const { data: registrations = [] } = useAdminRegistrations();
  const { data: checkins = [] } = useAdminCheckins();

  // Map snake_case fields to camelCase for UI
  const classes = Array.isArray(rawClasses) ? rawClasses.map((cls: any) => ({
    ...cls,
    categoryId: cls.category_id,
    durationMinutes: cls.duration, // ensure durationMinutes is set for the form
    maxCapacity: cls.max_capacity,
    isActive: cls.is_active,
    createdAt: cls.created_at,
    updatedAt: cls.updated_at,
    // Map category and group data from API response
    categories: cls.category,
  })) : [];

  // Ensure categories is always an array
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: null,
      difficulty: "beginner",
      durationMinutes: 60,
      maxCapacity: 20,
      equipment: "",
      isActive: true,
    },
  });

  const createClassMutation = useCreateAdminClass();

  const updateClassMutation = useUpdateAdminClass();

  const deleteClassMutation = useDeleteAdminClass();

  const categoriesOptions = categories.map((cat: any) => ({
    value: cat.id,
    label: cat.name,
  }));

  const filteredClasses = classes.filter((classItem: any) => {
    if (!classItem) return false;
    const searchText = `${classItem.name || ""} ${classItem.description || ""}`;
    return searchText.toLowerCase().includes((searchTerm || "").toLowerCase());
  });

  const handleSubmit = (data: ClassFormData) => {
    if (editingClass) {
      updateClassMutation.mutate({ classId: editingClass.id, data: mapClassToApi(data) });
    } else {
      createClassMutation.mutate(mapClassToApi(data));
    }
  };

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem);
    form.reset({
      name: classItem.name,
      description: classItem.description,
      categoryId: classItem.categoryId || null,
      difficulty: classItem.difficulty || "beginner",
      durationMinutes: classItem.durationMinutes,
      maxCapacity: classItem.maxCapacity,
      equipment: classItem.equipment || "",
      isActive: classItem.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (classItem: any) => {
    setClassToDelete(classItem);
    
    // Check for linked registrations
    const linkedRegistrations = registrations.filter((reg: any) => reg.classId === classItem.id);
    setLinkedRegistrationsCount(linkedRegistrations.length);
    
    // Check for linked checkins
    const linkedCheckins = checkins.filter((checkin: any) => checkin.classId === classItem.id);
    setLinkedCheckinsCount(linkedCheckins.length);
  };

  const handleDelete = (id: number) => {
    deleteClassMutation.mutate(id);
    setClassToDelete(null);
    setLinkedRegistrationsCount(0);
    setLinkedCheckinsCount(0);
  };

  const openCreateModal = () => {
    setEditingClass(null);
    form.reset({
      name: "",
      description: "",
      categoryId: null,
      difficulty: "beginner",
      durationMinutes: 60,
      maxCapacity: 20,
      equipment: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const getCategoryColor = (categoryId: number, classItem: any) => {
    // First try to get color from the class's category data (from API)
    let category = classItem?.categories;
    if (!category || !category.color) {
      // Fallback to categories list
      category = categories.find((cat: any) => cat && cat.id === categoryId);
    }
    if (category && category.color) {
      // Convert hex color to RGB and create very subtle versions
      const hex = category.color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Create very light background color (mix with 85% white)
      const lightR = Math.round(r + (255 - r) * 0.35);
      const lightG = Math.round(g + (255 - g) * 0.35);
      const lightB = Math.round(b + (255 - b) * 0.35);
      
      // Create muted text color (mix with gray)
      const mutedR = Math.round(r * 0.3 + 100 * 0.1);
      const mutedG = Math.round(g * 0.3 + 100 * 0.1);
      const mutedB = Math.round(b * 0.3 + 100 * 0.1);
      
      return {
        backgroundColor: `rgb(${lightR}, ${lightG}, ${lightB})`,
        color: `rgb(${mutedR}, ${mutedG}, ${mutedB})`
      };
    }
    return {
      backgroundColor: '#f8fafc',
      color: '#64748b'
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Classes</h1>
          <p className="text-muted-foreground">Manage gym classes and activities</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingClass ? "Edit Class" : "Add New Class"}</DialogTitle>
              <DialogDescription>
                {editingClass ? "Update class information" : "Add a new class to the gym"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., HIIT Training" />
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
                        <Textarea {...field} value={field.value || ""} placeholder="Brief description of the class..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          if (value === "none") {
                            field.onChange(null);
                          } else {
                            field.onChange(Number(value));
                          }
                        }} 
                        value={field.value === null || field.value === undefined ? "none" : field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categoriesOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Capacity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="equipment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Dumbbells, Treadmill" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createClassMutation.isPending || updateClassMutation.isPending}>
                    {editingClass ? "Update Class" : "Create Class"}
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
            placeholder="Search classes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>
            {filteredClasses.length} of {classes.length} classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoading || categoriesLoading) ? (
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
                  <TableHead>Class</TableHead>
                  <TableHead>Group & Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.map((classItem: any) => (
                  <TableRow key={classItem.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={getCategoryColor(classItem.categoryId, classItem)}
                        >
                          <span className="text-xs font-medium">
                            {classItem.categories?.name?.charAt(0)?.toUpperCase() || 
                             categories.find((cat: any) => cat && cat.id === classItem.categoryId)?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{classItem.name || 'Unnamed Class'}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {classItem.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start space-x-2">
                        {/* Long vertical bullet */}
                        <div 
                          className="w-1 h-8 rounded-full mt-0.5"
                          style={{ backgroundColor: classItem.categories?.group?.color || '#94a3b8' }}
                        />
                        <div className="flex flex-col space-y-1">
                          {/* Group */}
                          <span className="text-xs text-muted-foreground font-medium">
                            {classItem.categories?.group?.name || 'No group'}
                          </span>
                          {/* Category */}
                          <span className="text-sm font-semibold text-foreground">
                            {classItem.categories?.name || categories.find((cat: any) => cat && cat.id === classItem.categoryId)?.name || 'No category'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        {classItem.durationMinutes || 0} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{classItem.maxCapacity || 0}</span> people
                    </TableCell>
                    <TableCell>
                      <Badge variant={classItem.isActive ? 'default' : 'secondary'}>
                        {classItem.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(classItem)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteClick(classItem)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Class</AlertDialogTitle>
                              <AlertDialogDescription>
                                {(linkedRegistrationsCount > 0 || linkedCheckinsCount > 0) ? (
                                  <div className="space-y-2">
                                    <p className="text-red-600 font-medium">Cannot delete this class!</p>
                                    <p>
                                      This class has:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1">
                                      {linkedRegistrationsCount > 0 && (
                                        <li><strong>{linkedRegistrationsCount}</strong> registration{linkedRegistrationsCount > 1 ? 's' : ''}</li>
                                      )}
                                      {linkedCheckinsCount > 0 && (
                                        <li><strong>{linkedCheckinsCount}</strong> check-in{linkedCheckinsCount > 1 ? 's' : ''}</li>
                                      )}
                                    </ul>
                                    <p className="text-sm text-muted-foreground">
                                      Please remove all registrations and check-ins first before deleting this class.
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    Are you sure you want to delete &quot;{classItem.name}&quot;? This action cannot be undone.
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                setClassToDelete(null);
                                setLinkedRegistrationsCount(0);
                                setLinkedCheckinsCount(0);
                              }}>
                                {(linkedRegistrationsCount > 0 || linkedCheckinsCount > 0) ? 'Close' : 'Cancel'}
                              </AlertDialogCancel>
                              {(linkedRegistrationsCount === 0 && linkedCheckinsCount === 0) && (
                                <AlertDialogAction
                                  onClick={() => handleDelete(classItem.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              )}
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
