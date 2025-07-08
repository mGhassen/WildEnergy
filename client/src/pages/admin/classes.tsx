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
import { insertClassSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const classFormSchema = insertClassSchema;
type ClassFormData = z.infer<typeof classFormSchema>;

export default function AdminClasses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawClasses = [], isLoading } = useQuery({
    queryKey: ["/api/admin/classes"],
  });

  // Map snake_case fields to camelCase for UI
  const classes = (rawClasses || []).map((cls: any) => ({
    ...cls,
    categoryId: cls.category_id,
    duration: cls.duration,
    maxCapacity: cls.max_capacity,
    isActive: cls.is_active,
    createdAt: cls.created_at,
    updatedAt: cls.updated_at,
  }));

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/admin/categories"],
  });

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: 0,
      duration: 60,
      maxCapacity: 20,
      equipment: "",
      isActive: true,
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const response = await apiRequest("POST", "/api/admin/classes", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Class created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating class", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ClassFormData> }) => {
      const response = await apiRequest("PATCH", `/api/admin/classes/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      setIsModalOpen(false);
      setEditingClass(null);
      form.reset();
      toast({ title: "Class updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating class", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/classes"] });
      toast({ title: "Class deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting class", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const categoriesOptions = (Array.isArray(categories) ? categories : []).map((cat: any) => ({
    value: cat.id,
    label: cat.name,
  }));

  const filteredClasses = (Array.isArray(classes) ? classes : []).filter((classItem: any) => {
    if (!classItem) return false;
    const searchText = `${classItem.name || ""} ${classItem.description || ""}`;
    return searchText.toLowerCase().includes((searchTerm || "").toLowerCase());
  });

  const handleSubmit = (data: ClassFormData) => {
    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  const handleEdit = (classItem: any) => {
    setEditingClass(classItem);
    form.reset({
      name: classItem.name,
      description: classItem.description,
      categoryId: classItem.categoryId || 0,
      duration: classItem.duration,
      maxCapacity: classItem.maxCapacity,
      isActive: classItem.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this class?")) {
      deleteClassMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingClass(null);
    form.reset();
    setIsModalOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      yoga: "bg-green-100 text-green-800",
      hiit: "bg-red-100 text-red-800",
      strength: "bg-blue-100 text-blue-800",
      cardio: "bg-orange-100 text-orange-800",
      pilates: "bg-purple-100 text-purple-800",
      boxing: "bg-gray-100 text-gray-800",
    };
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800";
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
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
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
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>
            {filteredClasses.length} of {Array.isArray(classes) ? classes.length : 0} classes
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
                  <TableHead>Category</TableHead>
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
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {(Array.isArray(categories) ? categories : []).find((cat: any) => cat && cat.id === classItem.categoryId)?.name?.charAt(0)?.toUpperCase() || 'C'}
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
                      <Badge className="bg-blue-100 text-blue-800">
                        {(Array.isArray(categories) ? categories : []).find((cat: any) => cat && cat.id === classItem.categoryId)?.name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        {classItem.duration || 0} min
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(classItem.id)}
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
