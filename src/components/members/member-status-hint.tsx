"use client"

import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'

interface MemberStatusHintProps {
  memberStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'LEFT'
  metadata?: {
    fact?: {
      consent_window_started_at?: string
      consent_window_ends_at?: string
      approved_at?: string
      approved_by?: string
    }
  }
}

/**
 * Minimal UI hint component for member status
 * Shows:
 * - 'Waiting for approval' for PENDING members
 * - 'Consent window active' for PENDING members with consent window
 * - 'Approved' only after manual action (approved_at exists)
 */
export function MemberStatusHint({ memberStatus, metadata }: MemberStatusHintProps) {
  if (memberStatus === 'ACTIVE') {
    // Check if approved manually (has approved_at)
    const approvedAt = metadata?.fact?.approved_at
    if (approvedAt) {
      return (
        <Badge variant="success" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Patvirtinta
        </Badge>
      )
    }
    // Auto-approved (no approved_at)
    return (
      <Badge variant="success" className="bg-green-100 text-green-800">
        Aktyvus
      </Badge>
    )
  }

  if (memberStatus === 'PENDING') {
    // Check if consent window is active
    const consentWindowEndsAt = metadata?.fact?.consent_window_ends_at
    const now = new Date()
    
    if (consentWindowEndsAt) {
      const windowEnd = new Date(consentWindowEndsAt)
      const isWindowActive = windowEnd > now
      
      if (isWindowActive) {
        const daysLeft = Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Prieštaravimo terminas aktyvus ({daysLeft} d.)
          </Badge>
        )
      } else {
        // Window ended but still PENDING (manual approval required)
        return (
          <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Laukiama patvirtinimo
          </Badge>
        )
      }
    }
    
    // Regular PENDING (waiting for approval)
    return (
      <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Laukiama patvirtinimo
      </Badge>
    )
  }

  if (memberStatus === 'SUSPENDED') {
    return (
      <Badge variant="destructive" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
        Sustabdytas
      </Badge>
    )
  }

  if (memberStatus === 'LEFT') {
    return (
      <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
        Uždarytas
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {memberStatus}
    </Badge>
  )
}
