/**
 * MEMBER DASHBOARD MVP - Paprastas balsavimas
 * 
 * Funkcinis minimumas:
 * - Aktyvus balsavimas (jei yra)
 * - Countdown iki freeze
 * - "Mano balsas" po balsavimo
 * - Freeze message jei pavėlavo
 * 
 * @version 18.8.6 MVP
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadMemberDashboard } from '@/lib/dashboard/load-member-dashboard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import Link from 'next/link'

interface MemberDashboardProps {
  params: {
    slug: string
  }
}

function formatTimeRemaining(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days} d. ${hours} val.`
  }
  return `${hours} val.`
}

export default async function MemberDashboard({ params }: MemberDashboardProps) {
  const { slug } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load dashboard data
  const data = await loadMemberDashboard(slug, user.id)

  if (!data) {
    redirect('/dashboard')
  }

  const { org, user: userData, active_votes } = data

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* ========================================
          STATUS BAR
          ======================================== */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mano balsavimas</h1>
              <p className="text-sm text-muted-foreground">{org.name}</p>
            </div>
            <div>
              <Badge variant={userData.can_vote ? 'default' : 'destructive'}>
                Balsavimo teisė: {userData.can_vote ? 'TAIP' : 'NE'}
              </Badge>
            </div>
          </div>

          {!userData.can_vote && userData.can_vote_reason && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                ❌ Neturite balsavimo teisės: {userData.can_vote_reason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ========================================
          AKTYVŪS BALSAVIMAI
          ======================================== */}
      {active_votes.length > 0 ? (
        <div className="space-y-6">
          {active_votes.map((vote) => (
            <Card key={vote.vote_id}>
              <CardHeader>
                <CardTitle>{vote.resolution_title}</CardTitle>
                {vote.meeting_title && (
                  <p className="text-sm text-muted-foreground">
                    Susirinkimas: {vote.meeting_title}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* COUNTDOWN / FREEZE WARNING */}
                {vote.freeze.frozen ? (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      ⚠️ <strong>Nuotolinis balsavimas uždarytas</strong>
                      <div className="mt-2">
                        Susirinkimas prasidėjo:{' '}
                        {vote.meeting_scheduled_at &&
                          new Date(vote.meeting_scheduled_at).toLocaleString('lt-LT')}
                      </div>
                      <div className="mt-1">
                        Jei norite balsuoti, dalyvaukite susirinkime gyvai.
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : vote.freeze.warning && vote.freeze.time_remaining ? (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertDescription className="text-yellow-800">
                      ⏱️ <strong>Dėmesio!</strong> Liko{' '}
                      {formatTimeRemaining(vote.freeze.time_remaining)} iki balsavimo uždarymo
                      <div className="mt-1 text-sm">
                        Po to galėsite balsuoti tik gyvai susirinkime.
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : vote.freeze.freeze_at ? (
                  <div className="text-sm text-muted-foreground">
                    Balsavimas iki:{' '}
                    {new Date(vote.freeze.freeze_at).toLocaleString('lt-LT')}
                  </div>
                ) : null}

                {/* MANO BALSAS (jei balsavo) */}
                {vote.has_voted && vote.user_choice ? (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">
                      <div className="font-medium">✅ Jūsų balsas užfiksuotas</div>
                      <div className="mt-2">
                        Balsas:{' '}
                        <strong>
                          {vote.user_choice === 'FOR'
                            ? 'UŽ'
                            : vote.user_choice === 'AGAINST'
                              ? 'PRIEŠ'
                              : 'SUSILAIKAU'}
                        </strong>
                      </div>
                      {vote.user_voted_at && (
                        <div className="text-sm">
                          Laikas: {new Date(vote.user_voted_at).toLocaleString('lt-LT')}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : !vote.freeze.frozen && userData.can_vote ? (
                  /* BALSAVIMO MYGTUKAI */
                  <div className="grid gap-2 md:grid-cols-3">
                    <form action={`/api/vote/${vote.vote_id}/cast`} method="POST">
                      <input type="hidden" name="choice" value="FOR" />
                      <Button type="submit" className="w-full" size="lg">
                        <ThumbsUp className="mr-2 h-5 w-5" />
                        UŽ
                      </Button>
                    </form>
                    <form action={`/api/vote/${vote.vote_id}/cast`} method="POST">
                      <input type="hidden" name="choice" value="AGAINST" />
                      <Button
                        type="submit"
                        variant="destructive"
                        className="w-full"
                        size="lg"
                      >
                        <ThumbsDown className="mr-2 h-5 w-5" />
                        PRIEŠ
                      </Button>
                    </form>
                    <form action={`/api/vote/${vote.vote_id}/cast`} method="POST">
                      <input type="hidden" name="choice" value="ABSTAIN" />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        <Minus className="mr-2 h-5 w-5" />
                        SUSILAIKAU
                      </Button>
                    </form>
                  </div>
                ) : null}

                {/* Detalės link */}
                {vote.meeting_id && (
                  <div className="text-center">
                    <Link
                      href={`/dashboard/${slug}/governance/${vote.meeting_id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Žiūrėti susirinkimo detales →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            Šiuo metu nėra aktyvių balsavimų. Kai bus paskelbtas susirinkimas, galėsite balsuoti
            čia.
          </AlertDescription>
        </Alert>
      )}

      {/* Back link */}
      <div className="mt-6 text-center">
        <Link href={`/dashboard/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Grįžti į pagrindinį dashboard
        </Link>
      </div>
    </div>
  )
}
