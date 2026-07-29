"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  Users,
  Grid3X3,
  Table,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";
import { formatCurrency } from "@/lib/config";
import { usePlans } from "@/hooks/usePlans";

type AdminPlanSort =
  | "default"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "duration-asc"
  | "duration-desc"
  | "sessions-desc"
  | "sessions-asc"
  | "active-first";

const ADMIN_PLANS_SORT_STORAGE_KEY = "wildenergy-admin-plans-sort";

const ADMIN_PLAN_SORT_VALUES: readonly AdminPlanSort[] = [
  "default",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "duration-asc",
  "duration-desc",
  "sessions-desc",
  "sessions-asc",
  "active-first",
];

function parseStoredAdminPlanSort(raw: string | null): AdminPlanSort | null {
  if (!raw || !(ADMIN_PLAN_SORT_VALUES as readonly string[]).includes(raw))
    return null;
  return raw as AdminPlanSort;
}

function totalPlanSessions(plan: {
  plan_groups?: Array<{ session_count?: number }>;
}) {
  if (!plan.plan_groups?.length) return 0;
  return plan.plan_groups.reduce((t, g) => t + (g.session_count ?? 0), 0);
}

function sortMappedPlans(list: any[], sort: AdminPlanSort) {
  if (sort === "default") return list;
  const copy = [...list];
  switch (sort) {
    case "name-asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "price-asc":
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case "price-desc":
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case "duration-asc":
      return copy.sort((a, b) => a.durationDays - b.durationDays);
    case "duration-desc":
      return copy.sort((a, b) => b.durationDays - a.durationDays);
    case "sessions-desc":
      return copy.sort((a, b) => totalPlanSessions(b) - totalPlanSessions(a));
    case "sessions-asc":
      return copy.sort((a, b) => totalPlanSessions(a) - totalPlanSessions(b));
    case "active-first":
      return copy.sort((a, b) => {
        if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
        return a.isActive ? -1 : 1;
      });
    default:
      return list;
  }
}

export default function AdminPlans() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewType, setViewType] = useState<"cards" | "table">("cards");
  const [planSort, setPlanSort] = useState<AdminPlanSort>("default");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    try {
      const v = parseStoredAdminPlanSort(
        localStorage.getItem(ADMIN_PLANS_SORT_STORAGE_KEY),
      );
      if (v) setPlanSort(v);
    } catch {
      /* ignore */
    }
  }, []);

  const setPersistedPlanSort = useCallback((v: AdminPlanSort) => {
    setPlanSort(v);
    try {
      localStorage.setItem(ADMIN_PLANS_SORT_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const { data: plans, isLoading } = usePlans();

  const getGroupCategories = (group: any) => {
    if (!group.groups?.category_groups) return [];
    return group.groups.category_groups.map((cg: any) => cg.categories);
  };

  const toggleGroup = (planId: number, groupIndex: number) => {
    const groupKey = `${planId}-${groupIndex}`;
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const mappedPlans = useMemo(() => {
    const raw = Array.isArray(plans)
      ? plans.filter((plan: any) =>
          `${plan.name} ${plan.description}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        )
      : [];
    const mapped = raw.map((plan: any) => ({
      ...plan,
      durationDays: plan.duration_days ?? plan.durationDays,
      isActive: plan.is_active ?? plan.isActive,
    }));
    return sortMappedPlans(mapped, planSort);
  }, [plans, searchTerm, planSort]);

  const formatPrice = (price: string | number) => {
    return formatCurrency(Number(price));
  };

  const getDurationText = (days: number) => {
    if (days === 30) return "Monthly";
    if (days === 365) return "Yearly";
    if (days === 90) return "Quarterly";
    if (days === 180) return "Semi-Annual";
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Plans</h1>
          <p className="text-muted-foreground">
            Manage membership plans and subscriptions
          </p>
        </div>
        <Button onClick={() => router.push("/admin/plans/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Plan
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search plans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 shrink-0">
          <Select
            value={planSort}
            onValueChange={(v) => setPersistedPlanSort(v as AdminPlanSort)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="name-asc">Name (A–Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z–A)</SelectItem>
              <SelectItem value="price-asc">Price (low to high)</SelectItem>
              <SelectItem value="price-desc">Price (high to low)</SelectItem>
              <SelectItem value="duration-asc">
                Duration (shortest first)
              </SelectItem>
              <SelectItem value="duration-desc">
                Duration (longest first)
              </SelectItem>
              <SelectItem value="sessions-desc">
                Sessions (most first)
              </SelectItem>
              <SelectItem value="sessions-asc">
                Sessions (fewest first)
              </SelectItem>
              <SelectItem value="active-first">Active first</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={viewType === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("cards")}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="w-4 h-4" />
              Cards
            </Button>
            <Button
              variant={viewType === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("table")}
              className="flex items-center gap-2"
            >
              <Table className="w-4 h-4" />
              Table
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All Plans</h2>
            <p className="text-sm text-muted-foreground">
              {mappedPlans.length} of {Array.isArray(plans) ? plans.length : 0}{" "}
              plans
            </p>
          </div>
        </div>

        {isLoading ? (
          viewType === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-5 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-8 bg-muted rounded w-full"></div>
                      <div className="h-10 bg-muted rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <div className="border-b p-4">
                <div className="grid grid-cols-6 gap-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b p-4 animate-pulse">
                  <div className="grid grid-cols-6 gap-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : mappedPlans.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Plans Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first membership plan to start offering subscriptions.
            </p>
            <Button onClick={() => router.push("/admin/plans/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        ) : viewType === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mappedPlans.map((plan: any) => (
              <Card
                key={plan.id}
                className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/20 h-full flex flex-col"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {plan.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base text-foreground mb-1 truncate">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                          {plan.description || "No description provided"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={plan.isActive ? "default" : "secondary"}
                      className={`${plan.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""} flex-shrink-0 ml-2`}
                    >
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-primary mb-1">
                          {formatPrice(plan.price)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per {getDurationText(plan.durationDays).toLowerCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {plan.durationDays} days
                        </div>
                        <div className="text-xs text-muted-foreground">
                          duration
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        Included Groups
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {plan.plan_groups?.length || 0}
                      </Badge>
                    </div>

                    <div className="max-h-32 overflow-y-auto">
                      {plan.plan_groups && plan.plan_groups.length > 0 ? (
                        <div className="space-y-1">
                          {plan.plan_groups.map(
                            (group: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 bg-muted/30 rounded-md border text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full border border-white/20 flex-shrink-0"
                                    style={{
                                      backgroundColor:
                                        group.groups?.color || "#6B7280",
                                    }}
                                  />
                                  <span className="text-sm font-medium text-foreground truncate">
                                    {group.groups?.name || "Unknown Group"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                  <span className="text-xs text-muted-foreground">
                                    {group.session_count}s
                                  </span>
                                  {group.is_free && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-green-100 text-green-700 border-green-200 px-1 py-0"
                                    >
                                      FREE
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                          No groups included
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2 border-t mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/admin/plans/${plan.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/plans/${plan.id}/edit`)
                      }
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/admin/plans/${plan.id}/delete`)
                      }
                      className="hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="border-b bg-muted/30 p-4">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground">
                <div>Plan Name</div>
                <div>Price</div>
                <div>Duration</div>
                <div>Groups</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
            </div>

            <div className="divide-y">
              {mappedPlans.map((plan: any) => (
                <div
                  key={plan.id}
                  className="p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="grid grid-cols-6 gap-4 items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {plan.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {plan.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {plan.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-lg font-bold text-primary">
                        {formatPrice(plan.price)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        per {getDurationText(plan.durationDays).toLowerCase()}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {plan.durationDays} days
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getDurationText(plan.durationDays)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {plan.plan_groups?.length || 0}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {plan.plan_groups?.length > 0
                          ? `${plan.plan_groups.reduce((total: number, group: any) => total + group.session_count, 0)} sessions`
                          : "No groups"}
                      </div>
                    </div>

                    <div>
                      <Badge
                        variant={plan.isActive ? "default" : "secondary"}
                        className={`${plan.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/plans/${plan.id}`)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/plans/${plan.id}/edit`)
                        }
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/plans/${plan.id}/delete`)
                        }
                        className="hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {plan.plan_groups && plan.plan_groups.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="space-y-2">
                        {plan.plan_groups.map((group: any, index: number) => {
                          const categories = getGroupCategories(group);
                          const groupKey = `${plan.id}-${index}`;
                          const isExpanded = expandedGroups.has(groupKey);

                          return (
                            <div key={index} className="space-y-1">
                              <div
                                className="flex items-center gap-2 px-2 py-1 bg-muted/30 rounded-md text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleGroup(plan.id, index)}
                              >
                                <div
                                  className="w-2 h-2 rounded-full border border-white/20"
                                  style={{
                                    backgroundColor:
                                      group.groups?.color || "#6B7280",
                                  }}
                                />
                                <span className="font-medium text-foreground">
                                  {group.groups?.name || "Unknown Group"}
                                </span>
                                <span className="text-muted-foreground">
                                  ({group.session_count}s)
                                </span>
                                {group.is_free && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-green-100 text-green-700 border-green-200 px-1 py-0"
                                  >
                                    FREE
                                  </Badge>
                                )}
                                {categories.length > 0 && (
                                  <div className="flex items-center ml-auto">
                                    {isExpanded ? (
                                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                    )}
                                  </div>
                                )}
                              </div>
                              {categories.length > 0 && isExpanded && (
                                <div className="ml-4 text-xs text-muted-foreground animate-in slide-in-from-top-1 duration-200">
                                  <div className="space-y-1">
                                    {categories.map(
                                      (cat: any, catIndex: number) => (
                                        <div
                                          key={catIndex}
                                          className="flex items-center gap-2"
                                        >
                                          <div
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{
                                              backgroundColor:
                                                cat.color || "#6B7280",
                                            }}
                                          />
                                          <span>{cat.name}</span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
