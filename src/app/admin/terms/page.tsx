"use client";

import { useState, useMemo } from "react";
import { useAdminTerms, useCreateTerms, useUpdateTerms, useDeleteTerms, useActivateTerms } from "@/hooks/useAdminTerms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Circle, 
  Search,
  FileText,
  Calendar,
  Filter,
  MoreHorizontal,
  Eye,
  Copy,
  Download,
  SortAsc,
  SortDesc,
  X
} from "lucide-react";
import { formatDate } from "@/lib/date";
import DataTable from "@/components/data-table";

interface TermsFormData {
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  term_type: 'terms' | 'interior_regulation';
}

export default function AdminTerms() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTerms, setEditingTerms] = useState<any>(null);
  const [deletingTerms, setDeletingTerms] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const { toast } = useToast();

  const { data: terms = [], isLoading } = useAdminTerms();
  const createTermsMutation = useCreateTerms();
  const updateTermsMutation = useUpdateTerms();
  const deleteTermsMutation = useDeleteTerms();
  const activateTermsMutation = useActivateTerms();

  const [formData, setFormData] = useState<TermsFormData>({
    version: "",
    title: "",
    content: "",
    is_active: false,
    term_type: 'terms',
  });

  const filteredAndSortedTerms = useMemo(() => {
    let filtered = terms.filter((term) => {
      const matchesSearch = `${term.version} ${term.title} ${term.content}`.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && term.is_active) || 
        (statusFilter === "inactive" && !term.is_active);
      const matchesType = typeFilter === "all" || term.term_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });

    return filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "version":
          aValue = a.version;
          bValue = b.version;
          break;
        case "title":
          aValue = a.title;
          bValue = b.title;
          break;
        case "effective_date":
          aValue = new Date(a.effective_date).getTime();
          bValue = new Date(b.effective_date).getTime();
          break;
        case "created_at":
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [terms, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const handleCreate = () => {
    setFormData({
      version: "",
      title: "",
      content: "",
      is_active: false,
      term_type: 'terms',
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (term: any) => {
    setEditingTerms(term);
    setFormData({
      version: term.version,
      title: term.title,
      content: term.content,
      is_active: term.is_active,
      term_type: term.term_type || (term.title.toLowerCase().includes('interior regulation') ? 'interior_regulation' : 'terms'),
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.version || !formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTerms) {
        await updateTermsMutation.mutateAsync({
          id: editingTerms.id,
          data: formData,
        });
        toast({
          title: "Success",
          description: "Terms updated successfully",
        });
        setIsEditDialogOpen(false);
        setEditingTerms(null);
      } else {
        await createTermsMutation.mutateAsync(formData);
        toast({
          title: "Success",
          description: "Terms created successfully",
        });
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save terms",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingTerms) return;

    try {
      await deleteTermsMutation.mutateAsync(deletingTerms.id);
      toast({
        title: "Success",
        description: "Terms deleted successfully",
      });
      setDeletingTerms(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete terms",
        variant: "destructive",
      });
    }
  };

  const handleActivate = async (term: any) => {
    try {
      await activateTermsMutation.mutateAsync(term.id);
      toast({
        title: "Success",
        description: `Terms version ${term.version} activated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate terms",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      version: "",
      title: "",
      content: "",
      is_active: false,
      term_type: 'terms',
    });
    setEditingTerms(null);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortBy("created_at");
    setSortOrder("desc");
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Circle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    return type === 'terms' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200">
        Terms & Conditions
      </Badge>
    ) : (
      <Badge variant="outline" className="text-purple-600 border-purple-200">
        Interior Regulation
      </Badge>
    );
  };

  const handleSelectAll = () => {
    if (selectedTerms.length === filteredAndSortedTerms.length) {
      setSelectedTerms([]);
    } else {
      setSelectedTerms(filteredAndSortedTerms.map(term => term.id));
    }
  };

  const handleSelectTerm = (termId: string) => {
    setSelectedTerms(prev => 
      prev.includes(termId) 
        ? prev.filter(id => id !== termId)
        : [...prev, termId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedTerms.length === 0) return;

    try {
      await Promise.all(selectedTerms.map(id => deleteTermsMutation.mutateAsync(id)));
      toast({
        title: "Success",
        description: `${selectedTerms.length} terms deleted successfully`,
      });
      setSelectedTerms([]);
      setShowBulkActions(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some terms",
        variant: "destructive",
      });
    }
  };

  const handleBulkActivate = async () => {
    if (selectedTerms.length === 0) return;

    try {
      await Promise.all(selectedTerms.map(id => activateTermsMutation.mutateAsync(id)));
      toast({
        title: "Success",
        description: `${selectedTerms.length} terms activated successfully`,
      });
      setSelectedTerms([]);
      setShowBulkActions(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate some terms",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading terms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Terms & Conditions Management</h1>
          <p className="text-muted-foreground mt-1">Manage terms and conditions versions with advanced filtering and sorting</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          Create New Terms
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Terms</p>
                <p className="text-2xl font-bold text-foreground">{terms.length}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{terms.filter(t => t.is_active).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Terms & Conditions</p>
                <p className="text-2xl font-bold text-blue-600">{terms.filter(t => t.term_type === 'terms').length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interior Regulations</p>
                <p className="text-2xl font-bold text-purple-600">{terms.filter(t => t.term_type === 'interior_regulation').length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search terms by version, title, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(statusFilter !== "all" || typeFilter !== "all") && (
                <Badge variant="secondary" className="ml-1">
                  {[statusFilter !== "all" ? 1 : 0, typeFilter !== "all" ? 1 : 0].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>

            {/* Clear Filters */}
            {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="terms">Terms & Conditions</SelectItem>
                      <SelectItem value="interior_regulation">Interior Regulation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="effective_date">Effective Date</SelectItem>
                      <SelectItem value="version">Version</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTerms.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-foreground">
                  {selectedTerms.length} term{selectedTerms.length > 1 ? 's' : ''} selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTerms([])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleBulkActivate}
                  disabled={activateTermsMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Activate Selected
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Terms</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedTerms.length} selected terms? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete {selectedTerms.length} Terms
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms Table */}
      <Card>
        <CardContent className="p-0">
          {filteredAndSortedTerms.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No terms found matching your criteria</p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="p-4 w-12">
                      <input
                        type="checkbox"
                        checked={selectedTerms.length === filteredAndSortedTerms.length && filteredAndSortedTerms.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="p-4 font-medium text-muted-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("title")}
                        className="flex items-center gap-2 p-0 h-auto font-medium"
                      >
                        Title
                        {sortBy === "title" && (
                          sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                    <th className="p-4 font-medium text-muted-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("version")}
                        className="flex items-center gap-2 p-0 h-auto font-medium"
                      >
                        Version
                        {sortBy === "version" && (
                          sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                    <th className="p-4 font-medium text-muted-foreground">Type</th>
                    <th className="p-4 font-medium text-muted-foreground">Status</th>
                    <th className="p-4 font-medium text-muted-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("created_at")}
                        className="flex items-center gap-2 p-0 h-auto font-medium"
                      >
                        Created
                        {sortBy === "created_at" && (
                          sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                    <th className="p-4 font-medium text-muted-foreground">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("effective_date")}
                        className="flex items-center gap-2 p-0 h-auto font-medium"
                      >
                        Effective
                        {sortBy === "effective_date" && (
                          sortOrder === "asc" ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                    <th className="p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTerms.map((term) => (
                    <tr 
                      key={term.id} 
                      className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/admin/terms/${term.id}`}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTerms.includes(term.id)}
                          onChange={() => handleSelectTerm(term.id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{term.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {term.content.substring(0, 100)}...
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono">
                          v{term.version}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {getTypeBadge(term.term_type)}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(term.is_active)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(term.created_at)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(term.effective_date)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {!term.is_active && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActivate(term);
                              }}
                              disabled={activateTermsMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Activate
                            </Button>
                          )}
                          {!term.is_active && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Terms Version</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete terms version "{term.version}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      setDeletingTerms(term);
                                      handleDelete();
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTerms ? "Edit Terms" : "Create New Terms"}
            </DialogTitle>
            <DialogDescription>
              {editingTerms ? "Update the terms and conditions" : "Create a new version of terms and conditions"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 1.0, 2.0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Terms of Service v2.0 or Interior Regulation v1.0"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="term_type">Type *</Label>
              <select
                id="term_type"
                value={formData.term_type}
                onChange={(e) => setFormData({ ...formData, term_type: e.target.value as 'terms' | 'interior_regulation' })}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="terms">Terms & Conditions (Requires Acceptance)</option>
                <option value="interior_regulation">Interior Regulation (Display Only)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Terms & Conditions require member acceptance. Interior Regulations are for display only.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the terms and conditions content (Markdown supported)"
                rows={15}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                You can use Markdown formatting for the content
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTermsMutation.isPending || updateTermsMutation.isPending}
              >
                {createTermsMutation.isPending || updateTermsMutation.isPending ? "Saving..." : editingTerms ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
