'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Download, AlertCircle } from 'lucide-react'
import {
  finalizeMeetingProtocol,
  getProtocolPdfSignedUrl,
  listMeetingProtocols,
  type MeetingProtocol,
} from '@/app/actions/protocols'
import { generateProtocolPdf } from '@/app/actions/generate-protocol-pdf'
import { useToast } from '@/components/ui/use-toast'
import { ProtocolPreview } from './protocol-preview'

interface ProtocolActionsProps {
  meetingId: string
  orgId: string
  isOwner: boolean
  isBoard: boolean
}

export function ProtocolActions({
  meetingId,
  orgId,
  isOwner,
  isBoard,
}: ProtocolActionsProps) {
  const { toast } = useToast()
  const [protocols, setProtocols] = useState<MeetingProtocol[]>([])
  const [loading, setLoading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const loadProtocols = async () => {
    try {
      const data = await listMeetingProtocols(meetingId)
      setProtocols(data)
    } catch (error) {
      console.error('Error loading protocols:', error)
    }
  }

  const handleFinalize = async () => {
    if (!confirm('Ar tikrai norite finalizuoti protokolą? Po finalizavimo jis taps nemokomas.')) {
      return
    }

    setFinalizing(true)
    try {
      const result = await finalizeMeetingProtocol(meetingId)
      if (result.success) {
        toast({
          title: 'Protokolas finalizuotas',
          description: `Protokolas Nr. ${result.protocolNumber} sėkmingai finalizuotas`,
        })
        loadProtocols()
        setShowPreview(false)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko finalizuoti protokolo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error finalizing protocol:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setFinalizing(false)
    }
  }

  const handleGeneratePdf = async (protocol: MeetingProtocol) => {
    setGeneratingPdf(protocol.id)
    try {
      const result = await generateProtocolPdf(protocol.id)
      if (result.success) {
        toast({
          title: 'PDF sugeneruotas',
          description: 'Protokolo PDF sėkmingai sugeneruotas',
        })
        loadProtocols()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sugeneruoti PDF',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida generuojant PDF',
        variant: 'destructive',
      })
    } finally {
      setGeneratingPdf(null)
    }
  }

  const handleDownloadPdf = async (protocol: MeetingProtocol) => {
    try {
      const result = await getProtocolPdfSignedUrl(protocol.id)
      if (result.success && result.url) {
        window.open(result.url, '_blank')
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atsisiųsti PDF',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida atsisiunčiant PDF',
        variant: 'destructive',
      })
    }
  }

  // Load protocols on mount
  useEffect(() => {
    loadProtocols()
  }, [meetingId])

  if (!isOwner && !isBoard) {
    // Members can only see FINAL protocols
    if (protocols.length === 0) {
      return null
    }

    const finalProtocols = protocols.filter((p) => p.status === 'FINAL')
    if (finalProtocols.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Protokolai</h3>
        <div className="space-y-2">
          {finalProtocols.map((protocol) => (
            <div
              key={protocol.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <p className="font-medium">
                  Protokolas {protocol.protocol_number} (v{protocol.version})
                </p>
                <p className="text-sm text-gray-500">
                  Finalizuotas: {new Date(protocol.finalized_at || '').toLocaleDateString('lt-LT')}
                </p>
              </div>
              {protocol.pdf_path ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf(protocol)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Atsisiųsti PDF
                </Button>
              ) : (
                <span className="text-sm text-gray-500">PDF dar negeneruotas</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Admin view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Protokolai</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <FileText className="h-4 w-4 mr-2" />
            {showPreview ? 'Uždaryti peržiūrą' : 'Peržiūrėti protokolą'}
          </Button>
          {!protocols.some((p) => p.status === 'FINAL') && (
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? 'Finalizuojama...' : 'Finalizuoti protokolą'}
            </Button>
          )}
        </div>
      </div>

      {showPreview && (
        <ProtocolPreview meetingId={meetingId} onFinalize={handleFinalize} />
      )}

      {/* Existing Protocols */}
      {protocols.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Esami protokolai:</h4>
          {protocols.map((protocol) => (
            <div
              key={protocol.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <p className="font-medium">
                  Protokolas {protocol.protocol_number} (v{protocol.version})
                </p>
                <p className="text-sm text-gray-500">
                  Status: {protocol.status === 'FINAL' ? 'Finalizuotas' : 'Juodraštis'}
                  {protocol.finalized_at &&
                    ` • ${new Date(protocol.finalized_at).toLocaleDateString('lt-LT')}`}
                </p>
              </div>
              <div className="flex gap-2">
                {protocol.pdf_path ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(protocol)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Atsisiųsti PDF
                  </Button>
                ) : (
                  protocol.status === 'FINAL' && (isOwner || isBoard) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGeneratePdf(protocol)}
                      disabled={generatingPdf === protocol.id}
                    >
                      {generatingPdf === protocol.id ? (
                        'Generuojama...'
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Generuoti PDF
                        </>
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Warnings */}
      {protocols.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Protokolas dar nefinalizuotas. Peržiūrėkite protokolą ir finalizuokite, kai visi
            balsavimai uždaryti.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

