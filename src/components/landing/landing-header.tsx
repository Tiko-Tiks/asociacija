"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, UserCircle, Home } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'

interface LandingHeaderProps {
  isAuthenticated: boolean
  userName?: string
  userEmail?: string
  dashboardUrl?: string
}

export function LandingHeader({
  isAuthenticated,
  userName,
  userEmail,
  dashboardUrl,
}: LandingHeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Image
              src="/logo.svg"
              alt="Lietuvos Bendruomenių Branduolys"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Bendruomenių Branduolys</h1>
              <p className="text-xs text-slate-600">Lietuvos bendruomenių platforma</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    {userName && (
                      <span className="hidden sm:inline-block text-sm font-medium text-slate-700">
                        {userName}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 shadow-lg border-slate-200">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                          <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {userName && (
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {userName}
                            </p>
                          )}
                          {userEmail && (
                            <p className="text-xs text-slate-500 truncate">
                              {userEmail}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="h-px bg-slate-200 -mx-3" />
                    </div>
                  </DropdownMenuLabel>
                  {dashboardUrl && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={dashboardUrl}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-slate-100 transition-colors focus:bg-slate-100 focus:text-slate-900"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                          <Home className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">Eiti į paskyrą</p>
                          <p className="text-xs text-slate-500">Valdymo pultas</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-red-50 transition-colors focus:bg-red-50 focus:text-red-900 mt-1"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">Atsijungti</p>
                      <p className="text-xs text-slate-500">Išeiti iš sistemos</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                asChild 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
              >
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Prisijungti
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
