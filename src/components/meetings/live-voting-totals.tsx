'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'
import { setVoteLiveTotals, getVoteLiveTotals, getVoteTallies, type SetLiveTotalsResult } from '@/app/actions/live-voting'
import { useToast } from '@/components/ui/use-toast'

interface LiveVotingTotalsProps {
  voteId: string
  resolutionTitle: string
  canEdit: boolean
}

export function LiveVotingTotals({ voteId, resolutionTitle, canEdit }: LiveVotingTotalsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [liveTotals, setLiveTotals] = useState<{
    live_present_count: number
    live_for_count: number
    live_against_count: number
    live_abstain_count: number
  } | null>(null)
  const [remoteTallies, setRemoteTallies] = useState<{
    votes_for: number
    votes_against: number
    votes_abstain: number
    votes_total: number
  } | null>(null)
  const [formData, setFormData] = useState({
    live_against_count: 0,
    live_abstain_count: 0,
  })

  useEffect(() => {
    loadData()
  }, [voteId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load live totals
      const live = await getVoteLiveTotals(voteId)
      if (live) {
        setLiveTotals(live)
        setFormData({
          live_against_count: live.live_against_count,
          live_abstain_count: live.live_abstain_count,
        })
      } else {
        // Initialize with zeros if no data exists
        setLiveTotals({
          live_present_count: 0,
          live_for_count: 0,
          live_against_count: 0,
          live_abstain_count: 0,
        })
      }

      // Load remote tallies from vote_tallies view
      const tallies = await getVoteTallies(voteId)
      if (tallies) {
        setRemoteTallies(tallies)
      }
    } catch (error) {
      console.error('Error loading live totals:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti balsavimo duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canEdit) {
      toast({
        title: 'Klaida',
        description: 'Neturite teisių redaguoti',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const result = await setVoteLiveTotals(
        voteId,
        formData.live_against_count,
        formData.live_abstain_count
      )

      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Balsavimo duomenys sėkmingai išsaugoti',
        })
        await loadData()
      } else {
        const errorMessage =
          result.reason === 'INVALID_TOTALS'
            ? 'Neteisingi skaičiai (Už negali būti neigiamas)'
            : result.reason === 'VOTE_NOT_FOUND'
              ? 'Balsavimas nerastas'
              : 'Nepavyko išsaugoti'

        toast({
          title: 'Klaida',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error saving live totals:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Kraunama...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const livePresentCount = liveTotals?.live_present_count || 0
  const liveForCount =
    livePresentCount - formData.live_against_count - formData.live_abstain_count
  const liveTotal = liveForCount + formData.live_against_count + formData.live_abstain_count

  // Remote totals (placeholder - would come from vote_tallies)
  const remoteFor = remoteTallies?.votes_for || 0
  const remoteAgainst = remoteTallies?.votes_against || 0
  const remoteAbstain = remoteTallies?.votes_abstain || 0
  const remoteTotal = remoteTallies?.votes_total || 0

  // Final totals
  const finalFor = liveForCount + remoteFor
  const finalAgainst = formData.live_against_count + remoteAgainst
  const finalAbstain = formData.live_abstain_count + remoteAbstain
  const finalTotal = finalFor + finalAgainst + finalAbstain

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{resolutionTitle}</CardTitle>
        <CardDescription>Gyvo balsavimo rezultatai</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Remote subtotals */}
        {remoteTotal > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Nuotolinio balsavimo rezultatai:</p>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Už:</span>
                <span className="ml-2 font-semibold">{remoteFor}</span>
              </div>
              <div>
                <span className="text-gray-600">PRIEŠ:</span>
                <span className="ml-2 font-semibold">{remoteAgainst}</span>
              </div>
              <div>
                <span className="text-gray-600">SUSILAIKĖ:</span>
                <span className="ml-2 font-semibold">{remoteAbstain}</span>
              </div>
              <div>
                <span className="text-gray-600">Iš viso:</span>
                <span className="ml-2 font-semibold">{remoteTotal}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live totals input */}
        <div className="p-3 bg-gray-50 rounded-lg border">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Gyvai dalyvaujantys: <span className="font-bold">{livePresentCount}</span>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="live_against">Gyvai PRIEŠ *</Label>
              <Input
                id="live_against"
                type="number"
                min="0"
                max={livePresentCount}
                value={formData.live_against_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    live_against_count: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!canEdit || saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="live_abstain">Gyvai SUSILAIKĖ *</Label>
              <Input
                id="live_abstain"
                type="number"
                min="0"
                max={livePresentCount}
                value={formData.live_abstain_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    live_abstain_count: parseInt(e.target.value) || 0,
                  })
                }
                disabled={!canEdit || saving}
              />
            </div>
          </div>

          {/* Computed values */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Gyvai Už:</span>
                <span
                  className={`ml-2 font-semibold ${
                    liveForCount < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {liveForCount}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Gyvai PRIEŠ:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {formData.live_against_count}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Gyvai SUSILAIKĖ:</span>
                <span className="ml-2 font-semibold text-gray-600">
                  {formData.live_abstain_count}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Iš viso gyvai:</span>
                <span className="ml-2 font-semibold">{liveTotal}</span>
              </div>
            </div>
          </div>

          {liveForCount < 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              Klaida: Už skaičius negali būti neigiamas. Patikrinkite PRIEŠ ir SUSILAIKĖ skaičius.
            </div>
          )}

          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={saving || liveForCount < 0 || liveTotal !== livePresentCount}
              className="mt-4 w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Išsaugoma...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Išsaugoti
                </>
              )}
            </Button>
          )}
        </div>

        {/* Final totals */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm font-medium text-green-900 mb-2">Galutiniai rezultatai:</p>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Už:</span>
              <span className="ml-2 font-semibold text-green-600">{finalFor}</span>
            </div>
            <div>
              <span className="text-gray-600">PRIEŠ:</span>
              <span className="ml-2 font-semibold text-red-600">{finalAgainst}</span>
            </div>
            <div>
              <span className="text-gray-600">SUSILAIKĖ:</span>
              <span className="ml-2 font-semibold text-gray-600">{finalAbstain}</span>
            </div>
            <div>
              <span className="text-gray-600">Iš viso:</span>
              <span className="ml-2 font-semibold font-bold">{finalTotal}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

