'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, MapPin, FileText, Download, Vote, ArrowLeft, CheckCircle2, XCircle, Minus } from 'lucide-react'
import { getAgendaAttachmentSignedUrl } from '@/app/actions/meetings'
import { getVoteIdByResolution } from '@/app/actions/get-vote-by-resolution'
import { castVote, canCastVote } from '@/app/actions/voting'
import { useToast } from '@/components/ui/use-toast'
import type { Meeting, AgendaItem, AgendaAttachment } from '@/app/actions/meetings'
import { AgendaItemVoting } from './agenda-item-voting'
import { RemoteVotingIntent } from './remote-voting-intent'
import { AgendaAttachmentViewer } from './agenda-attachment-viewer'
import { hasRemoteAttendanceIntent } from '@/app/actions/meeting-attendance'
import { ChevronDown, ChevronUp, Eye } from 'lucide-react'

interface MeetingViewForMembersProps {
  meeting: Meeting
  agendaItems: AgendaItem[]
  attachments: Record<string, AgendaAttachment[]>
  orgSlug: string
}

export function MeetingViewForMembers({
  meeting,
  agendaItems,
  attachments,
  orgSlug,
}: MeetingViewForMembersProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [voteIdsMap, setVoteIdsMap] = useState<Record<string, string>>({})
  const [loadingVotes, setLoadingVotes] = useState<Record<string, boolean>>({})
  const [hasRemoteIntent, setHasRemoteIntent] = useState<boolean | null>(null)
  const [showVoting, setShowVoting] = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState<AgendaAttachment | null>(null)
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set())

  // Debug: Log attachments
  useEffect(() => {
    console.log('[MeetingView] Attachments received:', attachments)
    console.log('[MeetingView] Agenda items:', agendaItems.map(item => ({
      id: item.id,
      item_no: item.item_no,
      title: item.title,
      attachments: attachments[item.id]?.length || 0,
    })))
  }, [attachments, agendaItems])

  // Check if member has remote attendance intent
  useEffect(() => {
    const checkRemoteIntent = async () => {
      try {
        const hasIntent = await hasRemoteAttendanceIntent(meeting.id)
        setHasRemoteIntent(hasIntent)
        setShowVoting(hasIntent)
      } catch (error) {
        console.error('Error checking remote intent:', error)
        setHasRemoteIntent(false)
      }
    }

    checkRemoteIntent()
  }, [meeting.id])

  // Load vote IDs for agenda items with resolutions
  useEffect(() => {
    const loadVoteIds = async () => {
      const voteMap: Record<string, string> = {}
      
      for (const item of agendaItems) {
        if (item.resolution_id) {
          try {
            const voteId = await getVoteIdByResolution(meeting.id, item.resolution_id)
            if (voteId) {
              voteMap[item.id] = voteId
            }
          } catch (error) {
            console.error('Error loading vote ID for item:', item.id, error)
          }
        }
      }
      
      setVoteIdsMap(voteMap)
    }

    loadVoteIds()
  }, [agendaItems, meeting.id])

  const handleRemoteIntentConfirmed = () => {
    setHasRemoteIntent(true)
    setShowVoting(true)
    
    // Force reload vote IDs after remote intent confirmed
    // This ensures voteIdsMap is populated after registration
    const reloadVoteIds = async () => {
      const voteMap: Record<string, string> = {}
      
      for (const item of agendaItems) {
        if (item.resolution_id) {
          try {
            const voteId = await getVoteIdByResolution(meeting.id, item.resolution_id)
            if (voteId) {
              voteMap[item.id] = voteId
            }
          } catch (error) {
            console.error('Error loading vote ID for item:', item.id, error)
          }
        }
      }
      
      console.log('[MeetingView] Reloaded vote IDs after remote intent:', voteMap)
      setVoteIdsMap(voteMap)
    }
    
    reloadVoteIds()
  }

  const handleVoteSuccess = (itemId: string) => {
    const newVoted = new Set(votedItems)
    newVoted.add(itemId)
    setVotedItems(newVoted)
    
    // Check if all items are voted
    if (newVoted.size === agendaItems.length) {
      toast({
        title: '🎉 Ačiū už dalyvavimą!',
        description: `Jūs sėkmingai prabalsuote už visus ${agendaItems.length} darbotvarkės klausimus. Jūsų nuomonė užregistruota. Grąžiname į pagrindinį puslapį...`,
        duration: 5000,
      })
      // Redirect to dashboard after 5 seconds
      setTimeout(() => {
        router.push(`/dashboard/${orgSlug}`)
      }, 5000)
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

  // Check if meeting is completed or cancelled - no voting allowed
  const isMeetingClosed = meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED'

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

  const toggleExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/${orgSlug}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Grįžti į pagrindinį puslapį
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-blue-600">
                    Publikuotas susirinkimas
                  </Badge>
                  {meeting.published_at && (
                    <span className="text-sm text-slate-500">
                      Paskelbta: {new Date(meeting.published_at).toLocaleDateString('lt-LT')}
                    </span>
                  )}
                </div>
                <CardTitle className="text-2xl mb-3">{meeting.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(meeting.scheduled_at)}</span>
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{meeting.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Agenda Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Darbotvarkė ({agendaItems.length} klausimai)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agendaItems.map((item) => {
              const itemAttachments = attachments[item.id] || []
              const voteId = voteIdsMap[item.id]
              const isExpanded = expandedItems.has(item.id)
              
              // Debug for item #4
              if (item.item_no === 4) {
                console.log('[MeetingView] Item #4:', {
                  id: item.id,
                  title: item.title,
                  attachments: itemAttachments,
                  attachmentsCount: itemAttachments.length,
                  isExpanded,
                })
              }

              return (
                <div
                  key={item.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  {/* Item Header - Always Clickable */}
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-center">
                        {item.item_no}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 mb-1">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        {!item.summary && item.details && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {item.details.substring(0, 150)}...
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expandable Details - Always show when expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">

                      {/* Details */}
                      {item.details && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Išsamus aprašas:
                          </h4>
                          <div className="prose prose-sm max-w-none bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {item.details}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Attachments */}
                      {itemAttachments.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Prisekti dokumentai ({itemAttachments.length}):
                          </h4>
                          <div className="space-y-2">
                            {itemAttachments.map((att) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                              >
                                <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">
                                  {att.file_name}
                                </span>
                                {att.size_bytes && (
                                  <span className="text-xs text-slate-500">
                                    {(att.size_bytes / 1024).toFixed(1)} KB
                                  </span>
                                )}
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewingAttachment(att)}
                                    className="h-8 px-2"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Peržiūrėti
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownload(att)}
                                    className="h-8 px-2"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Debug: Show if no attachments found
                        item.item_no === 4 && (
                          <div className="text-xs text-slate-500 italic">
                            Debug: No attachments found for item #4 (ID: {item.id})
                          </div>
                        )
                      )}

                      {/* Voting - Show if has voteId and remote intent confirmed and meeting is not closed */}
                      {voteId && showVoting && !isMeetingClosed && (
                        <div className="border-t pt-4 mt-4">
                          {!votedItems.has(item.id) ? (
                            <AgendaItemVoting
                              voteId={voteId}
                              agendaItemTitle={item.title}
                              agendaItemNo={item.item_no}
                              meetingId={meeting.id}
                              onVoteSuccess={() => handleVoteSuccess(item.id)}
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                Balsas užregistruotas ✓
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {isMeetingClosed && voteId && (
                        <div className="border-t pt-4 mt-4">
                          <Alert>
                            <AlertDescription>
                              {meeting.status === 'COMPLETED' 
                                ? 'Susirinkimas užbaigtas. Balsavimas uždarytas.'
                                : 'Susirinkimas atšauktas. Balsavimas neįmanomas.'}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                      
                      {/* Info if agenda item has no voting */}
                      {!voteId && showVoting && item.resolution_id && (
                        <div className="border-t pt-3 mt-3">
                          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border">
                            <p className="text-sm text-muted-foreground">
                              Balsavimas šiam klausimui dar nepradėtas.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Remote Voting Intent - After Agenda - Only if meeting is not closed */}
      {hasRemoteIntent === false && !isMeetingClosed && (
        <div className="mt-6">
          <RemoteVotingIntent
            meetingId={meeting.id}
            meetingDate={meeting.scheduled_at}
            onConfirmed={handleRemoteIntentConfirmed}
          />
        </div>
      )}
      {isMeetingClosed && (
        <div className="mt-6">
          <Alert>
            <AlertDescription>
              {meeting.status === 'COMPLETED' 
                ? 'Susirinkimas užbaigtas. Balsavimas uždarytas.'
                : 'Susirinkimas atšauktas. Balsavimas neįmanomas.'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Attachment Viewer Dialog */}
      {viewingAttachment && (
        <AgendaAttachmentViewer
          attachment={viewingAttachment}
          isOpen={!!viewingAttachment}
          onClose={() => setViewingAttachment(null)}
        />
      )}
    </div>
  )
}

