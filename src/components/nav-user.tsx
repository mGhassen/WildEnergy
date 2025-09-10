"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"
import { usePathname, useRouter } from "next/navigation"
import { Shield, User, GraduationCap, Check } from "lucide-react"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { logout, user: authUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Portal switching logic
  const getCurrentPortal = () => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/member')) return 'member'
    return 'member'
  }

  const currentPortal = getCurrentPortal()
  const availablePortals = authUser?.accessiblePortals?.filter(portal => portal !== currentPortal) || []

  const handlePortalSwitch = (portal: string) => {
    if (portal === 'admin') {
      router.push('/admin')
    } else if (portal === 'member') {
      router.push('/member')
    }
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {availablePortals.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Switch Portal</DropdownMenuLabel>
                {availablePortals.map((portal) => {
                  const Icon = getPortalIcon(portal)
                  return (
                    <DropdownMenuItem
                      key={portal}
                      onClick={() => handlePortalSwitch(portal)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {getPortalName(portal)}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
