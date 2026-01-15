'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, UserPlus, Calendar, FileText, Award } from 'lucide-react'
import { LoginDialog } from '@/components/auth/login-dialog'

interface CommunityHeroSectionProps {
  name: string
  slug: string
  description: string | null
  stats: {
    events: number
    resolutions: number
    positions: number
  }
}

export function CommunityHeroSection({
  name,
  slug,
  description,
  stats,
}: CommunityHeroSectionProps) {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)

  return (
    <section className="min-h-screen bg-[#fafafa]">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-lg mx-auto">
          {/* Logo / Brand */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <span className="text-2xl font-bold text-white">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2">
              {name}
            </h1>
            <p className="text-slate-500">
              {description || 'Bendruomenės svetainė'}
            </p>
          </div>

          {/* Stats inline */}
          <div className="flex justify-center gap-6 mb-10 text-sm">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>{stats.events} renginiai</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <FileText className="h-4 w-4" />
              <span>{stats.resolutions} nutarimai</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Award className="h-4 w-4" />
              <span>{stats.positions} valdyba</span>
            </div>
          </div>

          {/* Main Card with two buttons */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 mb-4">
            <div className="space-y-3">
              <Button
                asChild
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Link href="/register">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registruotis
                </Link>
              </Button>
              
              <Button
                onClick={() => setLoginDialogOpen(true)}
                variant="outline"
                className="w-full h-11 rounded-xl border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Prisijungti
              </Button>
            </div>
          </div>
          
          <LoginDialog
            open={loginDialogOpen}
            onOpenChange={setLoginDialogOpen}
            redirectTo={`/c/${slug}`}
          />

          {/* Footer links */}
          <div className="flex justify-center gap-6 mt-10 text-sm">
            <Link href="#about" className="text-slate-500 hover:text-slate-900 transition-colors">
              Apie
            </Link>
            <Link href="#activity" className="text-slate-500 hover:text-slate-900 transition-colors">
              Veikla
            </Link>
            <Link href="#leadership" className="text-slate-500 hover:text-slate-900 transition-colors">
              Valdyba
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
