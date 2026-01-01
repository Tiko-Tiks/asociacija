'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Download, ExternalLink, Users, Vote } from 'lucide-react'
import { getAgendaItems, getAgendaAttachments, getAgendaAttachmentSignedUrl, type AgendaItem, type AgendaAttachment } from '@/app/actions/meetings'
import { getVoteIdByResolution } from '@/app/actions/get-vote-by-resolution'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import type { Meeting } from '@/app/actions/meetings'
import { MeetingCheckinList } from './meeting-checkin-list'
import { LiveVotingTotals } from './live-voting-totals'
import { AgendaBuilder } from './agenda-builder'

interface MeetingViewProps {
  meeting: Meeting
  orgId: string
  isOwner?: boolean
  isBoard?: boolean
}

export function MeetingView({ meeting, orgId, isOwner = false, isBoard = false }: MeetingViewProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [attachments, setAttachments] = useState<Record<string, AgendaAttachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [voteIdsMap, setVoteIdsMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadAgenda = async () => {
      try {
        const items = await getAgendaItems(meeting.id)
        setAgendaItems(items)

        // Load attachments for each item
        const attMap: Record<string, AgendaAttachment[]> = {}
        const voteMap: Record<string, string> = {}
        
        for (const item of items) {
          const atts = await getAgendaAttachments(item.id)
          attMap[item.id] = atts
          
          // Load vote ID for resolutions
          if (item.resolution_id) {
            const voteId = await getVoteIdByResolution(meeting.id, item.resolution_id)
            if (voteId) {
              voteMap[item.id] = voteId
            }
          }
        }
        setAttachments(attMap)
        setVoteIdsMap(voteMap)
      } catch (error) {
        console.error('Error loading agenda:', error)
        toast({
          title: 'Klaida',
          description: 'Nepavyko įkelti darbotvarkės',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadAgenda()
  }, [meeting.id, toast])

  const handleDownload = async (attachment: AgendaAttachment) => {
    try {
      const result = await getAgendaAttachmentSignedUrl(attachment.id)
      if (result.success && result.url) {
        window.open(result.url, '_blank')
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atsisiųsti failo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida atsisiunčiant failą',
        variant: 'destructive',
      })
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Nežinomas dydis'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Early return for loading state
  if (loading) {
    return <div className="text-sm text-gray-500">Kraunama...</div>
  }

  // Compute derived values
  const canManage = isOwner || isBoard
  const isPublished = meeting.status === 'PUBLISHED'
  const isDraft = meeting.status === 'DRAFT'

  // Main render
  return (
    <div className="space-y-6">
      {/* Meeting Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{meeting.title}</CardTitle>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <p>
                  <strong>Data ir laikas:</strong> {formatDate(meeting.scheduled_at)}
                </p>
                {meeting.location && (
                  <p>
                    <strong>Vieta:</strong> {meeting.location}
                  </p>
                )}
                {meeting.published_at && (
                  <p>
                    <strong>Publikuota:</strong> {formatDate(meeting.published_at)}
                  </p>
                )}
                {meeting.notice_days && (
                  <p>
                    <strong>Pranešimo terminas:</strong> {meeting.notice_days} dienos
                  </p>
                )}
              </div>
            </div>
            <Badge variant={meeting.status === 'PUBLISHED' ? 'default' : 'secondary'}>
              {meeting.status === 'PUBLISHED' ? 'Publikuota' : meeting.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different views */}
      {isPublished && canManage && (
        <Tabs defaultValue="checkin" className="w-full">
          <TabsList>
            <TabsTrigger value="checkin">
              <Users className="h-4 w-4 mr-2" />
              Dalyvavimas
            </TabsTrigger>
            <TabsTrigger value="agenda">
              <FileText className="h-4 w-4 mr-2" />
              Darbotvarkė
            </TabsTrigger>
            <TabsTrigger value="voting">
              <Vote className="h-4 w-4 mr-2" />
              Balsavimas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkin" className="space-y-4">
            <MeetingCheckinList
              meetingId={meeting.id}
              orgId={orgId}
              isOwner={isOwner}
              isBoard={isBoard}
            />
          </TabsContent>

          <TabsContent value="agenda">
            <Card>
              <CardHeader>
                <CardTitle>Darbotvarkė</CardTitle>
              </CardHeader>
              <CardContent>
                {agendaItems.length === 0 ? (
                  <p className="text-sm text-gray-500">Darbotvarkės klausimų nėra</p>
                ) : (
                  <div className="space-y-4">
                    {agendaItems.map((item) => {
                      const isExpanded = expandedItems.has(item.id)
                      return (
                        <Card key={item.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{item.item_no}</Badge>
                                <CardTitle className="text-base">{item.title}</CardTitle>
                              </div>
                              {(item.summary || item.details || attachments[item.id]?.length) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedItems)
                                    if (isExpanded) {
                                      newExpanded.delete(item.id)
                                    } else {
                                      newExpanded.add(item.id)
                                    }
                                    setExpandedItems(newExpanded)
                                  }}
                                >
                                  {isExpanded ? 'Suskleisti' : 'Išsamiau'}
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          {isExpanded && (
                            <CardContent className="space-y-4">
                              {item.summary && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    Trumpas aprašymas:
                                  </p>
                                  <p className="text-sm text-gray-600">{item.summary}</p>
                                </div>
                              )}

                              {item.details && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    Išsamus aprašymas:
                                  </p>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {item.details}
                                  </p>
                                </div>
                              )}

                              {item.resolution_id && (
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      router.push(`/dashboard/${orgId}/resolutions/${item.resolution_id}`)
                                    }
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Atidaryti nutarimą
                                  </Button>
                                </div>
                              )}

                              {/* Attachments */}
                              {attachments[item.id] && attachments[item.id].length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">Priedai:</p>
                                  <div className="space-y-2">
                                    {attachments[item.id].map((att) => (
                                      <div
                                        key={att.id}
                                        className="flex items-center justify-between p-2 border rounded"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <div>
                                            <p className="text-sm font-medium">{att.file_name}</p>
                                            <p className="text-xs text-gray-500">
                                              {formatFileSize(att.size_bytes)}
                                            </p>
                                          </div>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDownload(att)}
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Atsisiųsti
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voting">
            <div className="space-y-4">
              {agendaItems
                .filter((item) => item.resolution_id && voteIdsMap[item.id])
                .map((item) => (
                  <LiveVotingTotals
                    key={item.id}
                    voteId={voteIdsMap[item.id]}
                    resolutionTitle={item.title}
                    canEdit={canManage}
                  />
                ))}
              {agendaItems.filter((item) => item.resolution_id && voteIdsMap[item.id]).length === 0 && (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    Nėra balsavimų darbotvarkėje arba balsavimai dar nesukurti
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Agenda Builder for DRAFT meetings */}
      {isDraft && canManage && (
        <AgendaBuilder
          meetingId={meeting.id}
          orgId={orgId}
          isDraft={true}
        />
      )}

      {/* Agenda (shown by default if not published or not owner/board) */}
      {(!isPublished || !canManage) && !isDraft && (
        <Card>
          <CardHeader>
            <CardTitle>Darbotvarkė</CardTitle>
          </CardHeader>
          <CardContent>
          {agendaItems.length === 0 ? (
            <p className="text-sm text-gray-500">Darbotvarkės klausimų nėra</p>
          ) : (
            <div className="space-y-4">
              {agendaItems.map((item) => {
                const isExpanded = expandedItems.has(item.id)
                return (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.item_no}</Badge>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                        </div>
                        {(item.summary || item.details || attachments[item.id]?.length) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newExpanded = new Set(expandedItems)
                              if (isExpanded) {
                                newExpanded.delete(item.id)
                              } else {
                                newExpanded.add(item.id)
                              }
                              setExpandedItems(newExpanded)
                            }}
                          >
                            {isExpanded ? 'Suskleisti' : 'Išsamiau'}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="space-y-4">
                        {item.summary && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Trumpas aprašymas:
                            </p>
                            <p className="text-sm text-gray-600">{item.summary}</p>
                          </div>
                        )}

                        {item.details && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Išsamus aprašymas:
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {item.details}
                            </p>
                          </div>
                        )}

                        {item.resolution_id && (
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/dashboard/${orgId}/resolutions/${item.resolution_id}`)
                              }
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Atidaryti nutarimą
                            </Button>
                          </div>
                        )}

                        {/* Attachments */}
                        {attachments[item.id] && attachments[item.id].length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Priedai:</p>
                            <div className="space-y-2">
                              {attachments[item.id].map((att) => (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between p-2 border rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <div>
                                      <p className="text-sm font-medium">{att.file_name}</p>
                                      <p className="text-xs text-gray-500">
                                        {formatFileSize(att.size_bytes)}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(att)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Atsisiųsti
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

