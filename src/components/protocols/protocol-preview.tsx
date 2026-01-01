'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { previewMeetingProtocol, type ProtocolSnapshot } from '@/app/actions/protocols'
import { useToast } from '@/components/ui/use-toast'

interface ProtocolPreviewProps {
  meetingId: string
  onFinalize?: () => void
}

export function ProtocolPreview({ meetingId, onFinalize }: ProtocolPreviewProps) {
  const { toast } = useToast()
  const [snapshot, setSnapshot] = useState<ProtocolSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePreview = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await previewMeetingProtocol(meetingId)
      if (result.success && result.snapshot) {
        setSnapshot(result.snapshot)
      } else {
        setError(result.error || 'Nepavyko peržiūrėti protokolo')
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko peržiūrėti protokolo',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('Error previewing protocol:', err)
      setError('Įvyko netikėta klaida')
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Protokolo peržiūra</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handlePreview} disabled={loading}>
            {loading ? 'Kraunama...' : 'Peržiūrėti protokolą'}
          </Button>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Protokolo peržiūra</CardTitle>
            <Button variant="outline" onClick={() => setSnapshot(null)}>
              Uždaryti
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Info */}
          <div>
            <h3 className="text-lg font-semibold mb-2">{snapshot.meeting.title}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <strong>Data ir laikas:</strong> {formatDate(snapshot.meeting.scheduled_at)}
              </p>
              {snapshot.meeting.location && (
                <p>
                  <strong>Vieta:</strong> {snapshot.meeting.location}
                </p>
              )}
              {snapshot.meeting.published_at && (
                <p>
                  <strong>Publikuota:</strong> {formatDate(snapshot.meeting.published_at)}
                </p>
              )}
            </div>
          </div>

          {/* Attendance */}
          <div>
            <h4 className="font-semibold mb-2">Dalyvavimas</h4>
            <div className="space-y-1 text-sm">
              <p>Asmeniškai: {snapshot.attendance.present_in_person}</p>
              <p>Raštu: {snapshot.attendance.present_written}</p>
              <p>Nuotoliniu būdu: {snapshot.attendance.present_remote}</p>
              <p className="font-medium">
                Iš viso dalyvavo: {snapshot.attendance.present_total} iš{' '}
                {snapshot.attendance.total_active_members} narių
              </p>
            </div>
          </div>

          {/* Quorum */}
          <div>
            <h4 className="font-semibold mb-2">Kvorumas</h4>
            <div className="flex items-center gap-2">
              {snapshot.quorum.has_quorum ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Kvorumas pasiektas</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600 font-medium">Kvorumas nepasiektas</span>
                </>
              )}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p>Dalyvavo: {snapshot.quorum.present_count}</p>
              {snapshot.quorum.required_count && (
                <p>Reikia: {snapshot.quorum.required_count}</p>
              )}
              {snapshot.quorum.quorum_percentage && (
                <p>Kvorumo procentas: {snapshot.quorum.quorum_percentage}%</p>
              )}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <h4 className="font-semibold mb-4">Darbotvarkė</h4>
            <div className="space-y-4">
              {snapshot.agenda.map((item) => (
                <Card key={item.item_no}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{item.item_no}</Badge>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                        </div>
                        {item.summary && (
                          <p className="text-sm text-gray-600">{item.summary}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {item.details && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Išsamus aprašymas:</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.details}</p>
                      </div>
                    )}

                    {/* Resolution */}
                    {item.resolution && (
                      <div className="p-3 bg-blue-50 rounded">
                        <p className="text-sm font-medium text-blue-900 mb-1">Nutarimas:</p>
                        <p className="text-sm text-blue-800">{item.resolution.title}</p>
                        <Badge variant="secondary" className="mt-2">
                          {item.resolution.status}
                        </Badge>
                      </div>
                    )}

                    {/* Vote */}
                    {item.vote && (
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-900 mb-2">Balsavimas:</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.vote.status === 'CLOSED' ? 'secondary' : 'default'}>
                              {item.vote.status === 'CLOSED' ? 'Uždarytas' : 'Atviras'}
                            </Badge>
                            {item.vote.closed_at && (
                              <span className="text-xs text-gray-500">
                                Uždaryta: {formatDate(item.vote.closed_at)}
                              </span>
                            )}
                          </div>
                          {item.vote.tallies && (
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-green-600">
                                UŽ: <strong>{item.vote.tallies.votes_for}</strong>
                              </div>
                              <div className="text-red-600">
                                PRIEŠ: <strong>{item.vote.tallies.votes_against}</strong>
                              </div>
                              <div className="text-gray-600">
                                SUSILAIKĖ: <strong>{item.vote.tallies.votes_abstain}</strong>
                              </div>
                              <div className="col-span-3 text-xs text-gray-500">
                                Iš viso: {item.vote.tallies.votes_total} balsų
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {item.attachments && item.attachments.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Priedai:</p>
                        <div className="space-y-1">
                          {item.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span>{att.file_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Finalize Button */}
          {onFinalize && (
            <div className="pt-4 border-t">
              <Button onClick={onFinalize} className="w-full">
                Finalizuoti protokolą
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

