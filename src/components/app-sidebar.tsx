"use client"

import * as React from "react"
import {
  Command,
  LifeBuoy,
  Send,
  Settings2,
  Dumbbell,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin User",
    email: "admin@wildenergy.com",
    avatar: "/avatars/admin.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: BarChart3,
      isActive: true,
    },
    {
      title: "People",
      url: "/admin/members",
      icon: Users,
      items: [
        {
          title: "Users",
          url: "/admin/users",
        },
        {
          title: "Members",
          url: "/admin/members",
        },
        {
          title: "Trainers",
          url: "/admin/trainers",
        },
      ],
    },
    {
      title: "Program",
      url: "/admin/classes",
      icon: Calendar,
      items: [
        {
          title: "Classes",
          url: "/admin/classes",
        },
        {
          title: "Schedules",
          url: "/admin/schedules",
        },
        {
          title: "Courses",
          url: "/admin/courses",
        },
      ],
    },
    {
      title: "Attendance",
      url: "/admin/registrations",
      icon: ClipboardList,
      items: [
        {
          title: "Registrations",
          url: "/admin/registrations",
        },
        {
          title: "Check-ins",
          url: "/admin/checkins",
        },
      ],
    },
    {
      title: "Payments",
      url: "/admin/payments",
      icon: CreditCard,
      items: [
        {
          title: "Plans",
          url: "/admin/plans",
        },
        {
          title: "Subscriptions",
          url: "/admin/subscriptions",
        },
        {
          title: "Payments",
          url: "/admin/payments",
        },
      ],
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/admin/settings",
        },
        {
          title: "Categories",
          url: "/admin/categories",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/admin/support",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "/admin/feedback",
      icon: Send,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/admin">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Dumbbell className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Wild Energy</span>
                  <span className="truncate text-xs">Pole & Dance</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
