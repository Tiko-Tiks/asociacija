"use client"

import { User, LogOut, Building2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MobileSidebar } from "@/components/dashboard/sidebar"
import { DashboardLogo } from "@/components/dashboard/dashboard-logo"
import { logout } from "@/app/actions/auth"
import { useRouter } from "next/navigation"

interface HeaderProps {
  organizationName?: string
  userName?: string
  userEmail?: string
  activeOrgSlug?: string
  orgs?: Array<{ id: string; name: string; slug: string; membership_id: string }>
  selectedOrgId?: string
  isAdmin?: boolean
  isMember?: boolean
  orgSlug?: string
}

export function Header({
  organizationName = "Kaimo Bendruomenė",
  userName,
  userEmail,
  activeOrgSlug,
  orgs = [],
  selectedOrgId,
  isAdmin = false,
  isMember = false,
  orgSlug,
}: HeaderProps) {
  const router = useRouter()
  
  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {!isMember && (
            <>
              <MobileSidebar orgs={orgs} selectedOrgId={selectedOrgId} isAdmin={isAdmin} />
              {/* Logo with link to home - only for owners */}
              <DashboardLogo />
              <div className="hidden md:block h-6 w-px bg-slate-300" />
            </>
          )}
          {isMember && orgSlug ? (
            <Link 
              href={`/c/${orgSlug}`}
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors group"
            >
              <Building2 className="h-5 w-5 text-slate-500 group-hover:text-slate-700" />
              <h1 className="text-lg font-semibold">{organizationName}</h1>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            </Link>
          ) : (
            <h1 className="text-lg font-semibold text-slate-900 hidden md:block">
              {organizationName}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                  <User className="h-4 w-4" />
                </div>
                {userName && (
                  <span className="hidden sm:inline-block text-sm font-medium">
                    {userName}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  {userName && (
                    <p className="text-sm font-medium leading-none">
                      {userName}
                    </p>
                  )}
                  {userEmail && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {userEmail}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

