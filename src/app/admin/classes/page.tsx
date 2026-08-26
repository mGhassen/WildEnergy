"use client";

import { useState, useEffect } from "react";
import { useClientPagination } from "@/hooks/useClientPagination";
import { ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAdminClasses, useAdminCategories } from "@/hooks/useAdmin";
import { TableSkeleton } from "@/components/skeletons";
import { Plus, Search, Edit, Trash2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { resolveGroupForClass } from "@/lib/resolve-class-group";

export default function AdminClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const { data: rawClasses = [], isLoading } = useAdminClasses();
  const { data: rawCategories = [], isLoading: categoriesLoading } =
    useAdminCategories();

  const classes = Array.isArray(rawClasses)
    ? rawClasses.map((cls: any) => {
        return {
          ...cls,
          categoryId: cls.category_id,
          durationMinutes: cls.duration,
          maxCapacity: cls.max_capacity,
          isActive: cls.is_active,
          categories: {
            ...cls.category,
            group: resolveGroupForClass(cls),
          },
        };
      })
    : [];

  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  const filteredClasses = classes.filter((classItem: any) => {
    if (!classItem) return false;
    const searchText = `${classItem.name || ""} ${classItem.description || ""}`;
    return searchText.toLowerCase().includes((searchTerm || "").toLowerCase());
  });

  const {
    paginatedItems: paginatedClasses,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    resetPage,
    rangeStart,
    rangeEnd,
  } = useClientPagination(filteredClasses);

  useEffect(() => {
    resetPage();
  }, [searchTerm]);

  const getClassColor = (classItem: any) => {
    const hexColor = classItem?.color || "#94a3b8";
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const lightR = Math.round(r + (255 - r) * 0.35);
    const lightG = Math.round(g + (255 - g) * 0.35);
    const lightB = Math.round(b + (255 - b) * 0.35);
    const mutedR = Math.round(r * 0.3 + 100 * 0.1);
    const mutedG = Math.round(g * 0.3 + 100 * 0.1);
    const mutedB = Math.round(b * 0.3 + 100 * 0.1);
    return {
      backgroundColor: `rgb(${lightR}, ${lightG}, ${lightB})`,
      color: `rgb(${mutedR}, ${mutedG}, ${mutedB})`,
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Classes</h1>
          <p className="text-muted-foreground">
            Manage gym classes and activities
          </p>
        </div>
        <Button onClick={() => router.push("/admin/classes/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>
            {filteredClasses.length} of {classes.length} classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || categoriesLoading ? (
            <TableSkeleton rows={8} columns={6} />
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
                {paginatedClasses.map((classItem: any) => (
                  <TableRow key={classItem.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={getClassColor(classItem)}
                        >
                          <span className="text-xs font-medium">
                            {classItem.name?.charAt(0)?.toUpperCase() || "C"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {classItem.name || "Unnamed Class"}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {classItem.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              classItem.categories?.color || "#94a3b8",
                          }}
                        />
                        <span className="text-sm font-semibold text-foreground">
                          {classItem.categories?.name ||
                            categories.find(
                              (cat: any) =>
                                cat && cat.id === classItem.categoryId,
                            )?.name ||
                            "No category"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                        {classItem.durationMinutes || 0} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {classItem.maxCapacity || 0}
                      </span>{" "}
                      people
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={classItem.isActive ? "default" : "secondary"}
                      >
                        {classItem.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/admin/classes/${classItem.id}/edit`)
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(
                              `/admin/classes/${classItem.id}/delete`,
                            )
                          }
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredClasses.length > 0 && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="classes"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
