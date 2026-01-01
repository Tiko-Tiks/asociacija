import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  showHeader?: boolean
  showFooter?: boolean
}

/**
 * Unified Page Layout Component
 * 
 * Provides consistent header and footer across all pages.
 * Used for public pages, error pages, and auth pages.
 */
export function PageLayout({ 
  children, 
  showHeader = true, 
  showFooter = false 
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {showHeader && (
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Prisijungti</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register-community">Registruoti</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1">
        {children}
      </main>

      {showFooter && (
        <footer className="border-t bg-slate-50 py-12 mt-auto">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Image
                    src="/logo.svg"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="h-10 w-10"
                  />
                  <h3 className="font-bold text-slate-900">Bendruomenių Branduolys</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Lietuvos bendruomenių valdymo platforma
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Nuorodos</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/login" className="text-slate-600 hover:text-slate-900">
                      Prisijungti
                    </Link>
                  </li>
                  <li>
                    <Link href="/register-community" className="text-slate-600 hover:text-slate-900">
                      Registruoti bendruomenę
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-4">Kontaktai</h4>
                <p className="text-sm text-slate-600">
                  asociacija.net
                </p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t text-center text-sm text-slate-600">
              <p>© 2024 Lietuvos Bendruomenių Branduolys. Visos teisės saugomos.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

