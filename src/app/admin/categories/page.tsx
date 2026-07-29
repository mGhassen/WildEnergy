"use client";

import { useCategories } from "@/hooks/useCategories";
import { useAdminClasses } from "@/hooks/useAdmin";
import { TableSkeleton } from "@/components/skeletons";
import { Category } from "@/lib/api/categories";
import { AdminClass } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface CategoryWithUI extends Category {
  isActive: boolean;
}

export default function AdminCategories() {
  const router = useRouter();
  const { data: rawCategories = [], isLoading } = useCategories();
  const { data: classes = [] } = useAdminClasses();

  const categories: CategoryWithUI[] = (rawCategories || []).map(
    (cat: Category) => ({
      ...cat,
      isActive: cat.is_active,
    }),
  );

  const getClassCount = (categoryId: number) =>
    classes.filter((cls: AdminClass) => cls.category_id === categoryId).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Categories
          </h1>
          <p className="text-muted-foreground">
            Manage categories for your gym classes
          </p>
        </div>
        <Button onClick={() => router.push("/admin/categories/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
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
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: category.color || "#94a3b8",
                        }}
                      >
                        <span className="text-xs font-medium text-white">
                          {category.name?.charAt(0)?.toUpperCase() || "C"}
                        </span>
                      </div>
                      <div className="flex-1">
                        {category.groups && category.groups.length > 0 && (
                          <div className="mb-1 flex flex-wrap gap-1">
                            {category.groups.map((group: any) => (
                              <span
                                key={group.id}
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: group.color + "20",
                                  color: group.color || "#94a3b8",
                                }}
                              >
                                {group.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="font-medium text-foreground">
                          {category.name}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {category.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.isActive ? "default" : "secondary"}
                    >
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
                        onClick={() =>
                          router.push(`/admin/categories/${category.id}/edit`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(
                            `/admin/categories/${category.id}/delete`,
                          )
                        }
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
