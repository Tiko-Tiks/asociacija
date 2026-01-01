"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { Resolution, approveResolution, rejectResolution, getResolution } from '@/app/actions/resolutions'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { VotingSection } from '@/components/voting/voting-section'

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

  const getStatusBadge = () => {
    switch (currentResolution.status) {
      case 'DRAFT':
        return <Badge variant="secondary">Juodraštis</Badge>
      case 'PROPOSED':
        return <Badge variant="default">Pasiūlytas</Badge>
      case 'APPROVED':
        return (
          <Badge variant="success" className="bg-green-100 text-green-800">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Patvirtintas
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Atmestas
          </Badge>
        )
      case 'RECOMMENDED':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            Rekomenduota
          </Badge>
        )
      default:
        return <Badge variant="secondary">{currentResolution.status}</Badge>
    }
  }

  const getVisibilityBadge = () => {
    switch (currentResolution.visibility) {
      case 'PUBLIC':
        return (
          <Badge variant="outline" className="text-xs">
            <Eye className="mr-1 h-3 w-3" />
            Viešas
          </Badge>
        )
      case 'MEMBERS':
        return (
          <Badge variant="outline" className="text-xs">
            <EyeOff className="mr-1 h-3 w-3" />
            Nariams
          </Badge>
        )
      case 'INTERNAL':
        return (
          <Badge variant="outline" className="text-xs">
            <Lock className="mr-1 h-3 w-3" />
            Vidaus
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

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

  const canApprove = isOwner && (currentResolution.status === 'DRAFT' || currentResolution.status === 'PROPOSED')
  const canReject = isOwner && (currentResolution.status === 'DRAFT' || currentResolution.status === 'PROPOSED')
  const isApproved = currentResolution.status === 'APPROVED'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex-1">{currentResolution.title}</CardTitle>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
          {getVisibilityBadge()}
          <span className="text-xs text-muted-foreground">
            {formatDate(currentResolution.created_at)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 line-clamp-3 mb-4">
          {currentResolution.content}
        </p>

        {isApproved && currentResolution.adopted_at && (
          <p className="text-xs text-muted-foreground mb-4">
            Patvirtinta: {formatDate(currentResolution.adopted_at)}
          </p>
        )}

        {currentResolution.status === 'RECOMMENDED' && currentResolution.recommended_at && (
          <p className="text-xs text-muted-foreground mb-4">
            Rekomenduota: {formatDate(currentResolution.recommended_at)}
          </p>
        )}

        {(canApprove || canReject) && (
          <div className="flex gap-2 pt-2 border-t">
            {canApprove && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Atmesti
              </Button>
            )}
          </div>
        )}

        {/* Voting Section */}
        <div className="mt-4 pt-4 border-t">
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
