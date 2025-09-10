"use client"

import { usePathname, useRouter } from "next/navigation"
import { 
  Shield, 
  User, 
  GraduationCap, 
  ChevronRight,
  Check
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface Portal {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  description: string
}

const portals: Portal[] = [
  {
    id: 'admin',
    name: 'Admin Portal',
    icon: Shield,
    path: '/admin',
    description: 'Manage the platform'
  },
  {
    id: 'member',
    name: 'Member Portal',
    icon: User,
    path: '/member',
    description: 'Your personal dashboard'
  },
  {
    id: 'trainer',
    name: 'Trainer Portal',
    icon: GraduationCap,
    path: '/member', // Trainers use member portal for now
    description: 'Manage your classes'
  }
]

export function PortalSwitch() {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  if (!user?.accessiblePortals || user.accessiblePortals.length <= 1) {
    return null // Don't show switch if user only has access to one portal
  }

  const getCurrentPortal = () => {
    if (pathname.startsWith('/admin')) return 'admin'
    if (pathname.startsWith('/member')) return 'member'
    return 'member' // Default fallback
  }

  const currentPortal = getCurrentPortal()
  const availablePortals = portals.filter(portal => 
    user.accessiblePortals?.includes(portal.id)
  )

  const handlePortalSwitch = (portal: Portal) => {
    if (portal.id !== currentPortal) {
      router.push(portal.path)
    }
  }

  const currentPortalData = portals.find(p => p.id === currentPortal)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between text-left font-normal text-foreground hover:bg-muted"
        >
          <div className="flex items-center gap-2">
            {currentPortalData && (
              <>
                <currentPortalData.icon className="h-4 w-4" />
                <span className="truncate">{currentPortalData.name}</span>
              </>
            )}
          </div>
          <ChevronRight className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Switch Portal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePortals.map((portal) => {
          const isActive = portal.id === currentPortal
          const Icon = portal.icon
          
          return (
            <DropdownMenuItem
              key={portal.id}
              onClick={() => handlePortalSwitch(portal)}
              className="flex items-center gap-2 cursor-pointer hover:bg-muted"
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">{portal.name}</div>
                <div className="text-xs text-muted-foreground">
                  {portal.description}
                </div>
              </div>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
