'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Download, ExternalLink, Users, Vote } from 'lucide-react'
import { getAgendaItems, getAgendaAttachments, getAgendaAttachmentSignedUrl, publishMeeting, cancelMeeting, type AgendaItem, type AgendaAttachment } from '@/app/actions/meetings'
import { getVoteIdByResolution } from '@/app/actions/get-vote-by-resolution'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import type { Meeting } from '@/app/actions/meetings'
import { MeetingCheckinList } from './meeting-checkin-list'
import { LiveVotingSimple } from './live-voting-simple'
import { AgendaBuilder } from './agenda-builder'
import { ProtocolActions } from '@/components/protocols/protocol-actions'
import { Send, Loader2 } from 'lucide-react'

interface MeetingViewProps {
  meeting: Meeting
  orgId: string
  orgSlug: string
  isOwner?: boolean
  isBoard?: boolean
  membershipId?: string
}

export function MeetingView({ meeting, orgId, orgSlug, isOwner = false, isBoard = false, membershipId }: MeetingViewProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [attachments, setAttachments] = useState<Record<string, AgendaAttachment[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [voteIdsMap, setVoteIdsMap] = useState<Record<string, string>>({})
  const [publishing, setPublishing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const loadAgenda = async () => {
      try {
        console.log('[MeetingView] Loading agenda for meeting:', meeting.id, 'status:', meeting.status)
        const items = await getAgendaItems(meeting.id)
        console.log('[MeetingView] Loaded agenda items:', items.length, items)
        if (items.length === 0) {
          console.warn('[MeetingView] WARNING: No agenda items found for meeting:', meeting.id, 'status:', meeting.status)
        }
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
      hour12: false,
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
  const isCompleted = meeting.status === 'COMPLETED'

  const handlePublish = async () => {
    if (!canManage || !isDraft) return

    setPublishing(true)
    try {
      const result = await publishMeeting(meeting.id)
      
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: `Susirinkimas sėkmingai publikuotas. Pranešimo terminas: ${result.noticeDays || 'Nenustatytas'} dienos.`,
        })
        // Force refresh to get updated meeting status
        router.refresh()
        // Also reload the page to ensure fresh data
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        // Check if compliance error - redirect to onboarding
        if (result.complianceError) {
          const missingInfo = result.missingKeys?.length 
            ? `Trūksta: ${result.missingKeys.join(', ')}` 
            : ''
          toast({
            title: 'Trūksta valdymo nustatymų',
            description: `Prašome užpildyti privalomus valdymo nustatymus prieš publikuojant susirinkimą. ${missingInfo}`,
            variant: 'destructive',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/onboarding`)}
              >
                Užpildyti
              </Button>
            ),
          })
          return
        }
        
        // Check if error is about notice_days - redirect to edit
        const isNoticeError = result.error?.includes('Pranešimo terminas per trumpas') || 
                              result.error?.includes('notice') ||
                              result.error?.includes('NOTICE_TOO_SHORT')
        
        if (isNoticeError && isDraft) {
          // Redirect to edit page to fix the date
          toast({
            title: 'Pranešimo terminas per trumpas',
            description: 'Susirinkimo data neatitinka taisyklių. Nukreipiame į redagavimo puslapį, kad galėtumėte pataisyti datą.',
            variant: 'destructive',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/${orgSlug}/governance/${meeting.id}/edit`)}
              >
                Redaguoti
              </Button>
            ),
          })
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            router.push(`/dashboard/${orgSlug}/governance/${meeting.id}/edit`)
          }, 2000)
        } else {
          // Other errors
          toast({
            title: 'Klaida',
            description: result.error || 'Nepavyko publikuoti susirinkimo',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Error publishing meeting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida publikuojant susirinkimą',
        variant: 'destructive',
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Ar tikrai norite atšaukti šį susirinkimą? Visi balsavimai bus uždaryti.')) {
      return
    }

    setCancelling(true)
    try {
      const result = await cancelMeeting(meeting.id)
      if (result.success) {
        toast({
          title: 'Susirinkimas atšauktas',
          description: 'Susirinkimas sėkmingai atšauktas',
        })
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atšaukti susirinkimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error cancelling meeting:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida atšaukiant susirinkimą',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

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
            <div className="flex items-center gap-2">
              {/* Hide badge for DRAFT - actions are at the bottom */}
              {!isDraft && (
                <Badge variant={
                  meeting.status === 'PUBLISHED' ? 'default' : 
                  meeting.status === 'CANCELLED' ? 'destructive' : 
                  meeting.status === 'COMPLETED' ? 'default' : 
                  'secondary'
                }>
                  {meeting.status === 'PUBLISHED' ? 'Publikuota' : 
                   meeting.status === 'CANCELLED' ? 'Atšaukta' : 
                   meeting.status === 'COMPLETED' ? 'Užbaigta' : 
                   meeting.status}
                </Badge>
              )}
              {/* Publish button moved to bottom for DRAFT meetings */}
              {isPublished && canManage && meeting.status !== 'CANCELLED' && !isCompleted && (
                <Button
                  onClick={handleCancel}
                  disabled={cancelling}
                  size="sm"
                  variant="destructive"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Atšaukiama...
                    </>
                  ) : (
                    'Atšaukti susirinkimą'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different views */}
      {(isPublished || isCompleted) && canManage && (
        <Tabs defaultValue={isCompleted ? "protocols" : "checkin"} className="w-full">
          <TabsList>
            {/* Hide Dalyvavimas and Balsavimas for COMPLETED meetings */}
            {!isCompleted && (
              <>
                <TabsTrigger value="checkin">
                  <Users className="h-4 w-4 mr-2" />
                  Dalyvavimas
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="agenda">
              <FileText className="h-4 w-4 mr-2" />
              Darbotvarkė
            </TabsTrigger>
            {!isCompleted && (
              <TabsTrigger value="voting">
                <Vote className="h-4 w-4 mr-2" />
                Balsavimas
              </TabsTrigger>
            )}
            {isCompleted && (
              <TabsTrigger value="protocols">
                <FileText className="h-4 w-4 mr-2" />
                Protokolai
              </TabsTrigger>
            )}
          </TabsList>

          {!isCompleted && (
            <TabsContent value="checkin" className="space-y-4">
              <MeetingCheckinList
                meetingId={meeting.id}
                orgId={orgId}
                isOwner={isOwner}
                isBoard={isBoard}
              />
            </TabsContent>
          )}

          <TabsContent value="agenda">
            <Card>
              <CardHeader>
                <CardTitle>Darbotvarkė</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Kraunama...</p>
                ) : agendaItems.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">Darbotvarkės klausimų nėra</p>
                    <p className="text-xs text-gray-400">Debug: Meeting ID: {meeting.id}, Status: {meeting.status}, Items loaded: {agendaItems.length}</p>
                  </div>
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
                                      router.push(`/dashboard/${orgSlug}/resolutions/${item.resolution_id}`)
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

          {!isCompleted && (
            <TabsContent value="voting">
              <LiveVotingSimple
                meetingId={meeting.id}
                orgId={orgId}
                orgSlug={orgSlug}
              />
            </TabsContent>
          )}

          {isCompleted && (
            <TabsContent value="protocols" className="space-y-4">
              <ProtocolActions
                meetingId={meeting.id}
                orgId={orgId}
                orgSlug={orgSlug}
                isOwner={isOwner}
                isBoard={isBoard}
              />
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Agenda Builder for DRAFT meetings */}
      {isDraft && canManage && (
        <>
          {/* Workflow guidance for DRAFT meetings */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-blue-900">Susirinkimo kūrimo eiga</h3>
                  <p className="mt-1 text-sm text-blue-800">
                    Sudarykite darbotvarkę žemiau. Galite bet kada išeiti - pakeitimai išsaugomi automatiškai. 
                    Kai būsite pasiruošę, paspauskite "Publikuoti susirinkimą" viršuje.
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-blue-700">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      1. Pridėkite klausimus
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                      2. Prisekite dokumentus
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      3. Publikuokite
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <AgendaBuilder
            meetingId={meeting.id}
            orgId={orgId}
            isDraft={true}
            membershipId={membershipId}
          />

          {/* Bottom actions for DRAFT meetings */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-800">
                    <strong>Neturite visų dokumentų?</strong> Galite išeiti ir grįžti vėliau - susirinkimas išliks kaip juodraštis.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/${orgSlug}/governance`)}
                  >
                    Išsaugoti ir išeiti
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publikuojama...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Publikuoti susirinkimą
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Agenda (shown by default if not published or not owner/board, but NOT if completed with canManage - those use Tabs) */}
      {((!isPublished || !canManage) && !isDraft && !isCompleted) || (isCompleted && !canManage) ? (
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
                                router.push(`/dashboard/${orgSlug}/resolutions/${item.resolution_id}`)
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
      ) : null}
    </div>
  )
}

