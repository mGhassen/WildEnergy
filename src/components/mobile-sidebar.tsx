"use client"

import * as React from "react"
import { Menu, BarChart3, Users, Calendar, ClipboardList, CreditCard, Settings2, LifeBuoy, Send, LogOut, Dumbbell, User, Shield, GraduationCap, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getInitials } from "@/lib/auth"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: BarChart3,
      isActive: true,
    },
    {
      title: "People",
      url: "/admin/members",
      icon: Users,
      items: [
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
        {
          title: "Agenda",
          url: "/admin/agenda",
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
      title: "Billing & Plans",
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
          title: "Accounts",
          url: "/admin/accounts",
        },
        {
          title: "Categories",
          url: "/admin/categories",
        },
        {
          title: "Groups",
          url: "/admin/groups",
        },
        {
          title: "Terms & Conditions",
          url: "/admin/terms",
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

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    setOpen(false)
  }

  // Portal switching logic
  const getCurrentPortal = () => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin')) return 'admin'
      if (window.location.pathname.startsWith('/member')) return 'member'
    }
    return 'admin'
  }

  const currentPortal = getCurrentPortal()
  const availablePortals = user?.accessiblePortals?.filter(portal => portal !== currentPortal) || []

  const handlePortalSwitch = (portal: string) => {
    if (portal === 'admin') {
      router.push('/admin')
    } else if (portal === 'member') {
      router.push('/member')
    }
    setOpen(false)
  }

  const getPortalIcon = (portal: string) => {
    switch (portal) {
      case 'admin': return Shield
      case 'member': return User
      case 'trainer': return GraduationCap
      default: return User
    }
  }

  const getPortalName = (portal: string) => {
    switch (portal) {
      case 'admin': return 'Admin Portal'
      case 'member': return 'Member Portal'
      case 'trainer': return 'Trainer Portal'
      default: return 'Portal'
    }
  }

  const handleNavigation = (url: string) => {
    router.push(url)
    setOpen(false)
  }

  // Function to check if a menu item is active
  const isItemActive = (url: string) => {
    if (url === "/admin") {
      return pathname === "/admin" || pathname === "/admin/dashboard"
    }
    return pathname.startsWith(url)
  }

  // Function to check if any sub-item is active
  const hasActiveSubItem = (subItems?: { title: string; url: string }[]) => {
    if (!subItems) return false
    return subItems.some(subItem => isItemActive(subItem.url))
  }

  // Function to determine if a group should be open by default
  const shouldGroupBeOpen = (item: { url: string; items?: { title: string; url: string }[] }) => {
    return isItemActive(item.url) || hasActiveSubItem(item.items)
  }

  // Create user object for display
  const userForDisplay = user ? {
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: "/avatars/user.jpg",
  } : {
    name: "Guest",
    email: "",
    avatar: "/avatars/guest.jpg",
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-semibold">WildEnergy Admin</span>
              <p className="text-sm text-muted-foreground">Management Portal</p>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        {/* User Profile Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={userForDisplay.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user ? getInitials(user.firstName || "A", user.lastName || "") : "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{userForDisplay.name}</p>
              <p className="text-xs text-muted-foreground truncate">{userForDisplay.email}</p>
            </div>
          </div>
        </div>

        {/* Portal Switching */}
        {availablePortals.length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="text-sm font-medium text-muted-foreground mb-3">Switch Portal</div>
            <div className="space-y-2">
              {availablePortals.map((portal) => {
                const PortalIcon = getPortalIcon(portal)
                return (
                  <Button
                    key={portal}
                    variant="outline"
                    className="w-full justify-start h-12 px-4"
                    onClick={() => handlePortalSwitch(portal)}
                  >
                    <PortalIcon className="w-5 h-5 mr-3" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{getPortalName(portal)}</div>
                      <div className="text-xs text-muted-foreground">Switch to {portal} view</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Navigation - Using exact same shadcn structure as web */}
        <div className="flex-1 p-4">
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              {data.navMain.map((item) => {
                const isActive = isItemActive(item.url)
                const hasActiveChild = hasActiveSubItem(item.items)
                const isGroupOpen = shouldGroupBeOpen(item)
                
                return (
                  <Collapsible key={item.title} asChild defaultOpen={isGroupOpen}>
                    <SidebarMenuItem>
                      {item.items?.length ? (
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton 
                              tooltip={item.title}
                            >
                              <item.icon />
                              <span>{item.title}</span>
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuAction className="data-[state=open]:rotate-90">
                              <ChevronRight />
                              <span className="sr-only">Toggle</span>
                            </SidebarMenuAction>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items?.map((subItem) => {
                                const isSubItemActive = isItemActive(subItem.url)
                                
                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton 
                                      asChild
                                      isActive={isSubItemActive}
                                      className={isSubItemActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
                                    >
                                      <a href={subItem.url}>
                                        <span>{subItem.title}</span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </>
                      ) : (
                        <SidebarMenuButton 
                          asChild
                          tooltip={item.title}
                          isActive={isActive}
                          className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : ""}
                        >
                          <a href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>

          {/* Secondary Navigation - Same as web */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {data.navSecondary.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild size="sm">
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start h-12 px-4 text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <div className="flex-1 text-left">
              <div className="font-medium">Logout</div>
              <div className="text-xs text-muted-foreground">Sign out of your account</div>
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
