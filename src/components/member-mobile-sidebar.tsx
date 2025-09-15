"use client"

import * as React from "react"
import { Menu, LayoutDashboard, Calendar, CreditCard, User, LogOut, Dumbbell, Shield, GraduationCap, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getInitials } from "@/lib/auth"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigation = [
  { 
    name: "Dashboard", 
    href: "/member", 
    icon: LayoutDashboard,
    description: "Overview and quick actions",
    allowedForPending: false
  },
  { 
    name: "Courses & Schedule", 
    href: "/member/courses?view=day", 
    icon: Calendar,
    description: "Browse courses and view your schedule",
    allowedForPending: false
  },
  { 
    name: "Plans", 
    href: "/member/plans", 
    icon: CreditCard,
    description: "View available plans",
    allowedForPending: true
  },
  { 
    name: "My Subscriptions", 
    href: "/member/subscriptions", 
    icon: CreditCard,
    description: "Manage your plans",
    allowedForPending: false
  },
]

export function MemberMobileSidebar() {
  const [open, setOpen] = React.useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Check if user is pending approval
  const isPendingUser = user?.status === 'pending';
  
  // Filter navigation based on user status
  const filteredNavigation = isPendingUser 
    ? navigation.filter(item => item.allowedForPending)
    : navigation;

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
    return 'member'
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

  // Function to check if a menu item is active
  const isItemActive = (href: string) => {
    if (href === "/member") {
      return pathname === "/member"
    }
    return pathname.startsWith(href)
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
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full">
        <SheetHeader className="sr-only">
          <SheetTitle>Member Navigation Menu</SheetTitle>
        </SheetHeader>
        
        {/* Header Section */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Wild Energy</h3>
              <p className="text-sm text-muted-foreground">Pole & Dance</p>
            </div>
          </div>

          {/* Portal Switching */}
          {availablePortals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Switch Portal</p>
              {availablePortals.map((portal) => {
                const PortalIcon = getPortalIcon(portal)
                return (
                  <Button
                    key={portal}
                    variant="outline"
                    className="w-full justify-start h-10 px-3 text-sm"
                    onClick={() => handlePortalSwitch(portal)}
                  >
                    <PortalIcon className="w-4 h-4 mr-2" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{getPortalName(portal)}</div>
                    </div>
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.href)
              
              return (
                <Link key={item.name} href={item.href} onClick={() => setOpen(false)}>
                  <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}>
                    <Icon className="w-4 h-4" />
                    <div className="flex-1">
                      <div>{item.name}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Account Section */}
          <div className="mt-6 space-y-2">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Account
            </div>
            <Link href="/member/profile" onClick={() => setOpen(false)}>
              <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                <User className="w-4 h-4" />
                <div className="flex-1">
                  <div>My Profile</div>
                  <div className="text-xs opacity-70">Edit your information</div>
                </div>
              </div>
            </Link>
            {!isPendingUser && (
              <Link href="/member/history" onClick={() => setOpen(false)}>
                <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                  <History className="w-4 h-4" />
                  <div className="flex-1">
                    <div>My History</div>
                    <div className="text-xs opacity-70">View your activity</div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Footer with User Profile and Logout - At the very bottom */}
        <div className="p-4 border-t border-border bg-muted/30 mt-auto">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={userForDisplay.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {user ? getInitials(user.firstName || "M", user.lastName || "") : "M"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{userForDisplay.name}</p>
              <p className="text-xs text-muted-foreground truncate">{userForDisplay.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}