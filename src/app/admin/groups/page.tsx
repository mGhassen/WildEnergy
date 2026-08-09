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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGroups } from "@/hooks/useGroups";
import { TableSkeleton } from "@/components/skeletons";

export default function AdminGroups() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { data: groups, isLoading } = useGroups();

  const filteredGroups = Array.isArray(groups)
    ? groups.filter((group: any) =>
        `${group.name} ${group.description}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
    : [];

  const {
    paginatedItems: paginatedGroups,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    resetPage,
    rangeStart,
    rangeEnd,
  } = useClientPagination(filteredGroups);

  useEffect(() => {
    resetPage();
  }, [searchTerm]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Groups</h1>
          <p className="text-muted-foreground">Manage category groups</p>
        </div>
        <Button onClick={() => router.push("/admin/groups/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>All Groups</CardTitle>
          <CardDescription>
            {filteredGroups.length} of {groups?.length || 0} groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} columns={5} />
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
                {paginatedGroups.map((group: any) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{
                            backgroundColor: group.color + "20",
                            color: group.color,
                          }}
                        >
                          <span className="text-xs font-medium">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {group.name}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {group.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.categories && group.categories.length > 0 ? (
                          group.categories.map(
                            (category: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </div>
                            ),
                          )
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No categories
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={group.is_active ? "default" : "secondary"}
                      >
                        {group.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/admin/groups/${group.id}/edit`)
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            router.push(`/admin/groups/${group.id}/delete`)
                          }
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

          {filteredGroups.length > 0 && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="groups"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
