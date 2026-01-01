"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, FileText, Settings } from 'lucide-react'
import { EventModal, ResolutionModal } from './quick-publish-modals'
import Link from 'next/link'

interface ActionGridProps {
  orgId: string
  orgSlug: string
  canPublish: boolean
}

export function ActionGrid({ orgId, orgSlug, canPublish }: ActionGridProps) {
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false)

  if (!canPublish) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="opacity-50 cursor-not-allowed" title="Jūs neturite teisių publikuoti turinį">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-600">Renginys</p>
                <p className="text-xs text-slate-500">Neturite teisių</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="opacity-50 cursor-not-allowed" title="Jūs neturite teisių publikuoti turinį">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-600">Nutarimas</p>
                <p className="text-xs text-slate-500">Neturite teisių</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Link href={`/dashboard/${orgSlug}/settings`} className="block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Nustatymai</p>
                  <p className="text-xs text-slate-500">Valdyti nustatymus</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setEventModalOpen(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Renginys</p>
                <p className="text-xs text-slate-500">Pridėti naują renginį</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setResolutionModalOpen(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Nutarimas</p>
                <p className="text-xs text-slate-500">Sukurti naują nutarimą</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Link href={`/dashboard/${orgSlug}/settings`} className="block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Nustatymai</p>
                  <p className="text-xs text-slate-500">Valdyti nustatymus</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      <EventModal open={eventModalOpen} onOpenChange={setEventModalOpen} orgId={orgId} />
      <ResolutionModal open={resolutionModalOpen} onOpenChange={setResolutionModalOpen} orgId={orgId} />
    </>
  )
}

