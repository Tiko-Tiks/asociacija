// Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional

"use client"

import { User, LogOut, Building2, ChevronRight, ArrowLeft, LayoutDashboard, Settings, UserCircle, Bell, Search } from "lucide-react"
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
import { logout } from "@/app/actions/auth"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { RoleBadge } from "@/components/ui/status-badge"

interface HeaderProps {
  organizationName?: string
  userName?: string
  userEmail?: string
  activeOrgSlug?: string
  orgs?: Array<{ id: string; name: string; slug: string; membership_id: string; logo_url?: string | null }>
  selectedOrgId?: string
  isAdmin?: boolean
  isMember?: boolean
  orgSlug?: string
  orgLogoUrl?: string | null
  userRole?: "OWNER" | "MEMBER"
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
  orgLogoUrl,
  userRole,
}: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const handleLogout = async () => {
    await logout()
  }

  // Check if we're in a module page (not the main dashboard)
  const isModulePage = pathname?.match(/^\/dashboard\/[^\/]+\/(members|resolutions|projects|ideas|governance|voting|invoices|history|settings)/) !== null
  const dashboardUrl = activeOrgSlug ? `/dashboard/${activeOrgSlug}` : '/dashboard'

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6 gap-4">
        {/* Kairė pusė: Back button arba organizacijos pavadinimas */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {isModulePage && activeOrgSlug ? (
            <Link 
              href={dashboardUrl}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
            >
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 h-9 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Grįžti į dashboard</span>
              </Button>
            </Link>
          ) : null}
          {isMember && orgSlug && !isModulePage ? (
            <Link 
              href={`/c/${orgSlug}`}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
            >
              {orgLogoUrl ? (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={orgLogoUrl} alt={organizationName} className="object-cover" />
                  <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold">
                    {organizationName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
              )}
              <h1 className="text-lg font-semibold truncate">{organizationName}</h1>
              <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400 flex-shrink-0" />
            </Link>
          ) : null}
          {!isModulePage && !isMember && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{organizationName}</h1>
          )}
        </div>

        {/* Dešinė pusė: Search, Notifications, User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Search input */}
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="search"
              placeholder="Ieškoti..."
              className="pl-9 w-64 h-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Notifications bell */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Pranešimai"
          >
            <Bell className="h-5 w-5" />
            {/* Notification badge - jei yra neperskaitytų pranešimų */}
            {/* <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600" /> */}
          </Button>

          {/* User avatar su role badge */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-9 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src="" alt={userName || userEmail || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {userName ? userName.substring(0, 2).toUpperCase() : userEmail?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  {userName && (
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {userName}
                    </span>
                  )}
                  {userRole && (
                    <RoleBadge role={userRole} className="text-xs" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  {userName && (
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">
                      {userName}
                    </p>
                  )}
                  {userEmail && (
                    <p className="text-xs leading-none text-gray-600 dark:text-gray-400">
                      {userEmail}
                    </p>
                  )}
                  {userRole && (
                    <div className="pt-1">
                      <RoleBadge role={userRole} />
                    </div>
                  )}
                  {organizationName && (
                    <p className="text-xs leading-none text-gray-600 dark:text-gray-400 mt-1">
                      {organizationName}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeOrgSlug && (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/${activeOrgSlug}/settings`}
                      className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Nustatymai</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/dashboard/${activeOrgSlug}/profile`}
                      className="cursor-pointer focus:bg-accent focus:text-accent-foreground"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Profilis</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer focus:bg-accent focus:text-accent-foreground text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Atsijungti</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

