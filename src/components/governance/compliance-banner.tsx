'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getOrgCompliance, validateOrgCompliance, type ComplianceValidation } from '@/app/actions/governance-compliance'
import { useToast } from '@/components/ui/use-toast'

interface ComplianceBannerProps {
  orgId: string
  orgSlug: string
}

export function ComplianceBanner({ orgId, orgSlug }: ComplianceBannerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [compliance, setCompliance] = useState<{
    status: string
    issues: Array<{ message: string; severity: string }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadCompliance()
  }, [orgId])

  const loadCompliance = async () => {
    try {
      const data = await getOrgCompliance(orgId)
      if (data && data.status !== 'OK') {
        setCompliance({
          status: data.status,
          issues: data.issues.slice(0, 3).map((issue) => ({
            message: issue.message,
            severity: issue.severity,
          })),
        })
      } else {
        setCompliance(null)
      }
    } catch (error) {
      console.error('Error loading compliance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFix = () => {
    router.push(`/dashboard/${orgSlug}/settings/governance?fix=1`)
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  if (loading || dismissed || !compliance || compliance.status === 'OK') {
    return null
  }

  const isError = compliance.status === 'INVALID' || compliance.status === 'NEEDS_UPDATE'
  const topIssues = compliance.issues
    .filter((i) => i.severity === 'error')
    .slice(0, 3)

  return (
    <Alert
      variant={isError ? 'destructive' : 'default'}
      className="mb-4 border-amber-200 bg-amber-50"
    >
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">
        Įspėjimas
      </AlertTitle>
      <AlertDescription className="text-amber-800">
        <div className="space-y-2">
          <p>
            {compliance.status === 'INVALID'
              ? 'Trūksta privalomų bendruomenės nustatymų. Kai kurios funkcijos gali neveikti.'
              : 'Reikia atnaujinti nustatymus. Prašome vadovautis nuorodomis ir užpildyti trūkstamus arba pataisyti netinkamus duomenis.'}
          </p>
          {topIssues.length > 0 && (
            <ul className="list-disc list-inside text-sm space-y-1">
              {topIssues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={handleFix}
              size="sm"
              variant="default"
            >
              Papildyti duomenis
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

