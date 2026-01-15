// Dizainas pagal asociacija.net gaires v2026-01 – minimalistinis, audit-safe, institutional

"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Resolution, approveResolution, rejectResolution, getResolution } from '@/app/actions/resolutions'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { VotingSection } from '@/components/voting/voting-section'
import { formatDateLT } from '@/lib/utils'
import { ResolutionStatusBadge, VisibilityBadge } from '@/components/ui/status-badge'

interface ResolutionCardProps {
  resolution: Resolution
  orgId: string
  isOwner: boolean
  isBoard?: boolean
}

export function ResolutionCard({ resolution, orgId, isOwner, isBoard = false }: ResolutionCardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentResolution, setCurrentResolution] = useState<Resolution>(resolution)


  // Use centralized Lithuanian date formatting
  const formatDate = (dateString: string) => formatDateLT(dateString, 'medium')

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      const result = await approveResolution(orgId, currentResolution.id)
      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Sprendimas patvirtintas",
        })
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko patvirtinti sprendimo",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko patvirtinti sprendimo",
        variant: "destructive" as any,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      const result = await rejectResolution(orgId, currentResolution.id)
      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Sprendimas atmestas",
        })
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko atmesti sprendimo",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko atmesti sprendimo",
        variant: "destructive" as any,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const canApprove = isOwner && currentResolution.status === 'PROPOSED'
  const canReject = isOwner && currentResolution.status === 'PROPOSED'
  const isApproved = currentResolution.status === 'APPROVED'

  return (
    <Card className="card-institutional hover-subtle">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg flex-1 text-gray-900 dark:text-gray-100">
            {currentResolution.title}
          </CardTitle>
          <ResolutionStatusBadge status={currentResolution.status} />
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <VisibilityBadge visibility={currentResolution.visibility} />
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {formatDate(currentResolution.created_at)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
          {currentResolution.content}
        </p>

        {isApproved && currentResolution.adopted_at && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Patvirtinta: {formatDate(currentResolution.adopted_at)}
          </p>
        )}

        {(canApprove || canReject) && (
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            {canApprove && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Patvirtinti
              </Button>
            )}
            {canReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={isProcessing}
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Atmesti
              </Button>
            )}
          </div>
        )}

        {/* Voting Section */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <VotingSection
            resolutionId={currentResolution.id}
            orgId={currentResolution.org_id}
            isOwner={isOwner}
            isBoard={isBoard}
            onResolutionStatusChanged={async () => {
              // Refetch resolution to get updated status (APPROVED/RECOMMENDED)
              const updated = await getResolution(currentResolution.id)
              if (updated) {
                setCurrentResolution(updated)
              }
              // Refresh Next.js cache to update server components
              router.refresh()
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
