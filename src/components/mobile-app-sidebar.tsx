"use client"

import * as React from "react"
import { Menu, LayoutDashboard, Calendar, History, User, LogOut, Dumbbell, Shield, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getInitials } from "@/lib/auth"
import Link from "next/link"

const navigation = [
  { 
    name: "Home", 
    href: "/mobile-app", 
    icon: LayoutDashboard,
    description: "Dashboard overview"
  },
  { 
    name: "Classes", 
    href: "/mobile-app", 
    icon: Calendar,
    description: "Browse and book classes"
  },
  { 
    name: "My Bookings", 
    href: "/mobile-app", 
    icon: History,
    description: "View your reservations"
  },
  { 
    name: "Profile", 
    href: "/mobile-app", 
    icon: User,
    description: "Account settings"
  },
]

export function MobileAppSidebar() {
  const [open, setOpen] = React.useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    setOpen(false)
  }

  // Portal switching logic
  const getCurrentPortal = () => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin')) return 'admin'
      if (window.location.pathname.startsWith('/member')) return 'member'
      if (window.location.pathname.startsWith('/mobile-app')) return 'mobile-app'
    }
    return 'mobile-app'
  }

  const currentPortal = getCurrentPortal()
  const availablePortals = user?.accessiblePortals?.filter(portal => portal !== currentPortal) || []

  const handlePortalSwitch = (portal: string) => {
    if (portal === 'admin') {
      router.push('/admin')
    } else if (portal === 'member') {
      router.push('/member')
    } else if (portal === 'mobile-app') {
      router.push('/mobile-app')
    }
    setOpen(false)
  }

  const getPortalIcon = (portal: string) => {
    switch (portal) {
      case 'admin': return Shield
      case 'member': return User
      case 'mobile-app': return Dumbbell
      case 'trainer': return GraduationCap
      default: return User
    }
  }

  const getPortalName = (portal: string) => {
    switch (portal) {
      case 'admin': return 'Admin Portal'
      case 'member': return 'Member Portal'
      case 'mobile-app': return 'Mobile App'
      case 'trainer': return 'Trainer Portal'
      default: return 'Portal'
    }
  }

  const handleNavigation = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold">Wild Energy</span>
              <p className="text-xs text-muted-foreground">Pole & Dance</p>
            </div>
          </SheetTitle>
        </SheetHeader>
        
        {/* User Profile in Mobile Menu */}
        <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg mb-6">
          <Avatar className="w-12 h-12">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user ? getInitials(user.firstName || "M", user.lastName || "") : "M"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {user ? `${user.firstName} ${user.lastName}` : "Member"}
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">Premium</Badge>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} onClick={handleNavigation}>
                <div className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent">
                  <Icon className="w-4 h-4" />
                  <div className="flex-1">
                    <div>{item.name}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Portal Switching */}
        {availablePortals.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Switch Portal
            </div>
            {availablePortals.map((portal) => {
              const Icon = getPortalIcon(portal);
              return (
                <div
                  key={portal}
                  onClick={() => {
                    handlePortalSwitch(portal);
                    setOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <Icon className="w-4 h-4" />
                  <div className="flex-1">
                    <div>{getPortalName(portal)}</div>
                    <div className="text-xs opacity-70">Access {portal} features</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Logout */}
        <div className="mt-6 space-y-2">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Actions
          </div>
          <div
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <div className="flex-1">
              <div>Logout</div>
              <div className="text-xs opacity-70">Sign out of your account</div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
