'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, Minus, Save, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { getAgendaItems, type AgendaItem } from '@/app/actions/meetings'
import { getMeetingAttendance } from '@/app/actions/meeting-attendance'

interface LiveVotingSimpleProps {
  meetingId: string
  orgId: string
  orgSlug: string
}

interface VoteCount {
  for: number
  against: number
  abstain: number
}

export function LiveVotingSimple({ meetingId, orgId, orgSlug }: LiveVotingSimpleProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [voteCounts, setVoteCounts] = useState<Record<string, VoteCount>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const [liveAttendeeCount, setLiveAttendeeCount] = useState(0)

  useEffect(() => {
    loadAgenda()
    loadLiveAttendees()
  }, [meetingId])

  const loadLiveAttendees = async () => {
    try {
      const attendance = await getMeetingAttendance(meetingId)
      const liveCount = attendance.filter(a => a.attendance_type === 'IN_PERSON').length
      setLiveAttendeeCount(liveCount)
    } catch (error) {
      console.error('Error loading attendance:', error)
    }
  }

  const loadAgenda = async () => {
    try {
      const items = await getAgendaItems(meetingId)
      setAgendaItems(items)
      
      // Initialize vote counts to 0
      const initialCounts: Record<string, VoteCount> = {}
      items.forEach(item => {
        initialCounts[item.id] = { for: 0, against: 0, abstain: 0 }
      })
      setVoteCounts(initialCounts)
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

  const handleCountChange = (itemId: string, type: 'for' | 'against' | 'abstain', value: string) => {
    const numValue = parseInt(value) || 0
    setVoteCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [type]: Math.max(0, numValue), // Don't allow negative
      }
    }))
  }

  const handleSave = async (itemId: string) => {
    setSaving(prev => ({ ...prev, [itemId]: true }))
    
    try {
      const counts = voteCounts[itemId]
      const total = counts.for + counts.against + counts.abstain
      
      if (total === 0) {
        toast({
          title: 'Įspėjimas',
          description: 'Įveskite bent vieną balsą',
          variant: 'destructive',
        })
        setSaving(prev => ({ ...prev, [itemId]: false }))
        return
      }

      // Validate: cannot exceed live attendees
      if (total > liveAttendeeCount) {
        toast({
          title: 'Klaida',
          description: `Balsų skaičius (${total}) negali viršyti gyvai dalyvaujančių skaičiaus (${liveAttendeeCount})`,
          variant: 'destructive',
        })
        setSaving(prev => ({ ...prev, [itemId]: false }))
        return
      }

      // Get the agenda item to find its vote
      const item = agendaItems.find(i => i.id === itemId)
      if (!item?.resolution_id) {
        toast({
          title: 'Klaida',
          description: 'Šis klausimas neturi rezoliucijos. Susisiekite su administratoriumi.',
          variant: 'destructive',
        })
        setSaving(prev => ({ ...prev, [itemId]: false }))
        return
      }

      // Get vote ID for this resolution
      const { getVoteIdByResolution } = await import('@/app/actions/get-vote-by-resolution')
      const voteId = await getVoteIdByResolution(meetingId, item.resolution_id)
      
      if (!voteId) {
        toast({
          title: 'Klaida',
          description: 'Balsavimas šiam klausimui nerastas. Susisiekite su administratoriumi.',
          variant: 'destructive',
        })
        setSaving(prev => ({ ...prev, [itemId]: false }))
        return
      }

      // Save live voting totals to database
      const { setVoteLiveTotals } = await import('@/app/actions/live-voting')
      const saveResult = await setVoteLiveTotals(voteId, counts.against, counts.abstain)
      
      if (!saveResult.ok) {
        toast({
          title: 'Klaida',
          description: saveResult.reason === 'INVALID_TOTALS' 
            ? 'Neteisingi balsų skaičiai' 
            : 'Nepavyko išsaugoti rezultatų į duomenų bazę',
          variant: 'destructive',
        })
        setSaving(prev => ({ ...prev, [itemId]: false }))
        return
      }

      toast({
        title: 'Išsaugota',
        description: `Gyvo balsavimo rezultatai išsaugoti DB (Už: ${saveResult.live_for_count}, Prieš: ${counts.against}, Susilaikė: ${counts.abstain})`,
      })
      
      // Mark as saved
      setSavedItems(prev => new Set(prev).add(itemId))
    } catch (error) {
      console.error('Error saving votes:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko išsaugoti rezultatų',
        variant: 'destructive',
      })
    } finally {
      setSaving(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleCompleteMeeting = async () => {
    if (!confirm('Ar tikrai norite užbaigti šį susirinkimą? Visi balsavimai bus uždaryti ir rezoliucijos patvirtintos.')) {
      return
    }

    try {
      // STEP 1: Close all votes and apply results
      const { closeAllVotesForMeeting } = await import('@/app/actions/vote-management')
      const closeResult = await closeAllVotesForMeeting(meetingId)
      
      if (!closeResult.success && closeResult.closed === 0 && closeResult.error) {
        toast({
          title: 'Klaida',
          description: closeResult.error,
          variant: 'destructive',
        })
        return
      }
      
      if (closeResult.closed > 0) {
        toast({
          title: 'Balsavimai uždaryti',
          description: `Uždaryta ${closeResult.closed} balsavimų ir pritaikyti rezultatai`,
        })
      }

      // STEP 2: Complete the meeting
      const { completeMeeting } = await import('@/app/actions/meetings')
      const result = await completeMeeting(meetingId)
      
      if (result.success) {
        toast({
          title: '🎉 Susirinkimas užbaigtas',
          description: result.abstainCount 
            ? `Susirinkimas sėkmingai užbaigtas. Automatiškai užregistruota ${result.abstainCount} susilaikymo balsų. Grįžtate į susirinkimų sąrašą...`
            : 'Susirinkimas sėkmingai užbaigtas. Grįžtate į susirinkimų sąrašą...',
          duration: 5000,
        })
        
        setTimeout(() => {
          router.push(`/dashboard/${orgSlug}/governance`)
        }, 3000)
      } else {
        // Check if error is about already completed meeting
        if (result.error?.includes('COMPLETED') || result.error?.includes('užbaigtas')) {
          toast({
            title: 'Informacija',
            description: 'Susirinkimas jau užbaigtas',
          })
          // Redirect to governance page
          setTimeout(() => {
            router.push(`/dashboard/${orgSlug}/governance`)
          }, 2000)
        } else {
          toast({
            title: 'Klaida',
            description: result.error || 'Nepavyko užbaigti susirinkimo',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Error completing meeting:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko užbaigti susirinkimo',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-slate-500">Kraunama...</p>
        </CardContent>
      </Card>
    )
  }

  const allSaved = agendaItems.length > 0 && agendaItems.every(item => savedItems.has(item.id))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle>Gyvo balsavimo registracija</CardTitle>
              <p className="text-sm text-slate-600 mt-2">
                Įveskite gyvo balsavimo rezultatus kiekvienam darbotvarkės klausimui
              </p>
              {liveAttendeeCount > 0 && (
                <Alert className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Gyvai dalyvauja:</strong> {liveAttendeeCount} nariai. Balsų skaičius negali viršyti šio skaičiaus.
                  </AlertDescription>
                </Alert>
              )}
              {liveAttendeeCount === 0 && (
                <Alert className="mt-3 border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Nėra registruotų gyvai dalyvaujančių narių. Pirmiausia užregistruokite dalyvius "Dalyvavimas" skiltyje.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {allSaved && liveAttendeeCount > 0 && (
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 ml-4"
                onClick={handleCompleteMeeting}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Užbaigti susirinkimą
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {agendaItems.map((item) => {
        const counts = voteCounts[item.id] || { for: 0, against: 0, abstain: 0 }
        const total = counts.for + counts.against + counts.abstain
        const isSaving = saving[item.id]
        const isSaved = savedItems.has(item.id)

        return (
          <Card key={item.id} className={isSaved ? 'bg-green-50 border-green-300' : ''}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-center">
                  {item.item_no}
                </span>
                <div className="flex-1">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  {item.details && (
                    <p className="text-sm text-slate-600 mt-1">{item.details}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isSaved ? (
                // Saved state - show summary
                <div className="p-4 bg-green-100 border border-green-300 rounded">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Rezultatai užregistruoti</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-700">{counts.for}</div>
                      <div className="text-xs text-green-600">Už</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-700">{counts.against}</div>
                      <div className="text-xs text-red-600">Prieš</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-700">{counts.abstain}</div>
                      <div className="text-xs text-amber-600">Susilaikė</div>
                    </div>
                  </div>
                </div>
              ) : (
                // Input state
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Už */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Už
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={counts.for}
                        onChange={(e) => handleCountChange(item.id, 'for', e.target.value)}
                        className="text-center text-lg font-semibold border-green-300 focus:border-green-500"
                      />
                    </div>

                    {/* Prieš */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-red-700">
                        <XCircle className="h-4 w-4" />
                        Prieš
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={counts.against}
                        onChange={(e) => handleCountChange(item.id, 'against', e.target.value)}
                        className="text-center text-lg font-semibold border-red-300 focus:border-red-500"
                      />
                    </div>

                    {/* Susilaikė */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-amber-700">
                        <Minus className="h-4 w-4" />
                        Susilaikė
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={counts.abstain}
                        onChange={(e) => handleCountChange(item.id, 'abstain', e.target.value)}
                        className="text-center text-lg font-semibold border-amber-300 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Total and Save */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm text-slate-600">
                      <span className="font-semibold">Iš viso:</span> {total} balsai
                    </div>
                    <Button
                      onClick={() => handleSave(item.id)}
                      disabled={isSaving || total === 0}
                      size="sm"
                    >
                      {isSaving ? (
                        'Saugoma...'
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Patvirtinti
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

