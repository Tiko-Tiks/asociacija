'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, FolderKanban, FileText, UserPlus } from 'lucide-react'

interface QuickActionsProps {
  orgSlug: string
  userRole: string
}

/**
 * Quick Actions Component
 * 
 * FAB or Button Row for common actions:
 * - + Naujas Projektas
 * - + Rašyti Sąskaitą
 * - + Kviesti Narį
 */
export function QuickActions({ orgSlug, userRole }: QuickActionsProps) {
  const router = useRouter()

  const isOwner = userRole === 'OWNER'

  if (!isOwner) {
    return null // Only show for OWNER role
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => router.push(`/dashboard/${orgSlug}/projects/new`)}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Plus className="mr-2 h-4 w-4" />
        Naujas Projektas
      </Button>
      <Button
        onClick={() => router.push(`/dashboard/${orgSlug}/invoices`)}
        variant="outline"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <FileText className="mr-2 h-4 w-4" />
        Rašyti Sąskaitą
      </Button>
      <Button
        onClick={() => router.push(`/dashboard/${orgSlug}/members`)}
        variant="outline"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <UserPlus className="mr-2 h-4 w-4" />
        Kviesti Narį
      </Button>
    </div>
  )
}

