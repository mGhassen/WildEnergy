"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminTerms, useUpdateTerms, useActivateTerms } from "@/hooks/useAdminTerms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Edit,
  CheckCircle,
  Circle,
  Save,
  X
} from "lucide-react";
import { formatDate } from "@/lib/date";
import { FormSkeleton } from "@/components/skeletons";

interface TermsFormData {
  version: string;
  title: string;
  content: string;
  is_active: boolean;
  term_type: 'terms' | 'interior_regulation';
}

export default function AdminTermsView() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const termId = params.id as string;

  const { data: terms = [], isLoading } = useAdminTerms();
  const updateTermsMutation = useUpdateTerms();
  const activateTermsMutation = useActivateTerms();
  
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TermsFormData>({
    version: "",
    title: "",
    content: "",
    is_active: false,
    term_type: 'terms',
  });

  useEffect(() => {
    if (terms.length > 0 && termId) {
      const term = terms.find(t => t.id === termId);
      if (term) {
        setCurrentTerm(term);
        setFormData({
          version: term.version,
          title: term.title,
          content: term.content,
          is_active: term.is_active,
          term_type: term.term_type || (term.title.toLowerCase().includes('interior regulation') ? 'interior_regulation' : 'terms'),
        });
      } else {
        toast({
          title: "Error",
          description: "Terms not found",
          variant: "destructive",
        });
        router.push("/admin/terms");
      }
    }
  }, [terms, termId, toast, router]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to original values
    if (currentTerm) {
      setFormData({
        version: currentTerm.version,
        title: currentTerm.title,
        content: currentTerm.content,
        is_active: currentTerm.is_active,
        term_type: currentTerm.term_type || (currentTerm.title.toLowerCase().includes('interior regulation') ? 'interior_regulation' : 'terms'),
      });
    }
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
      await updateTermsMutation.mutateAsync({
        id: currentTerm.id,
        data: formData,
      });
      toast({
        title: "Success",
        description: "Terms updated successfully",
      });
      setIsEditing(false);
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update terms",
        variant: "destructive",
      });
    }
  };

  const handleActivate = async () => {
    try {
      await activateTermsMutation.mutateAsync(currentTerm.id);
      toast({
        title: "Success",
        description: `Terms version ${currentTerm.version} activated successfully`,
      });
      // Refresh the page to get updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to activate terms",
        variant: "destructive",
      });
    }
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  if (!currentTerm) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Terms Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested terms could not be found.</p>
          <Button onClick={() => router.push("/admin/terms")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Terms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/terms")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-8 h-8" />
              {currentTerm.title}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-muted-foreground">Version {currentTerm.version}</span>
              <div className="flex items-center gap-2">
                {getTypeBadge(currentTerm.term_type)}
                {getStatusBadge(currentTerm.is_active)}
              </div>
            </div>
          </div>
        </div>
        
        {!isEditing && (
          <div className="flex gap-2">
            {!currentTerm.is_active && (
              <Button
                onClick={handleActivate}
                disabled={activateTermsMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Activate
              </Button>
            )}
            <Button onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Terms Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Content
              </CardTitle>
              <CardDescription>
                {isEditing ? "Edit the terms content below" : "Terms and conditions document"}
              </CardDescription>
            </div>
            {!isEditing && (
              <div className="text-sm text-muted-foreground">
                Created {formatDate(currentTerm.created_at)} • Effective {formatDate(currentTerm.effective_date)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Label htmlFor="term_type">Type *</Label>
                  <Select
                    value={formData.term_type}
                    onValueChange={(value) => setFormData({ ...formData, term_type: value as 'terms' | 'interior_regulation' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terms">Terms & Conditions</SelectItem>
                      <SelectItem value="interior_regulation">Interior Regulation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the terms and conditions content (Markdown supported)"
                  rows={25}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  You can use Markdown formatting for the content
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTermsMutation.isPending}
                >
                  {updateTermsMutation.isPending ? (
                    <>
                      <Save className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div 
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: currentTerm.content?.replace(/\n/g, '<br>') || 'No content available' 
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
