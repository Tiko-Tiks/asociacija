/**
 * CHAIR DASHBOARD - Pirmininko pultas
 * 
 * Atsakomybė (TIK):
 * - Autorizuoti vartotoją
 * - Load data
 * - Layout komponentus
 * 
 * ❌ Jokios verslo logikos
 * ❌ Jokio balsavimo skaičiavimo
 * 
 * @version 18.8.6
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadChairDashboard } from '@/lib/dashboard/load-chair-dashboard'
import { ChairStatusBar } from '@/components/chair/status-bar'
import { ChairMeetingHeader } from '@/components/chair/meeting-header'
import { LiveQuorumWidget } from '@/components/chair/live-quorum-widget'
import { LiveAttendancePanel } from '@/components/chair/live-attendance-panel'
import { ProceduralItemsPanel } from '@/components/chair/procedural-items-panel'
import { ChairAgendaPanel } from '@/components/chair/chair-agenda-panel'
import { ProtocolPanel } from '@/components/chair/protocol-panel'
import { GACompletionPanel } from '@/components/chair/ga-completion-panel'
import { CloseVotesButton } from '@/components/meetings/close-votes-button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface ChairDashboardProps {
  params: {
    slug: string
  }
}

export default async function ChairDashboard({ params }: ChairDashboardProps) {
  const { slug } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load dashboard data
  const data = await loadChairDashboard(slug, user.id)

  if (!data) {
    redirect('/dashboard')
  }

  const { org, user: userData, ga_mode, active_meeting, agenda_items } = data

  return (
    <div className="container mx-auto max-w-6xl space-y-6 py-8">
      {/* 1. STATUS BAR */}
      <ChairStatusBar
        orgName={org.name}
        gaMode={ga_mode}
        meetingStatus={active_meeting?.status}
        userRole="PIRMININKAS"
      />

      {active_meeting ? (
        <>
          {/* 2. MEETING HEADER */}
          <ChairMeetingHeader
            title={active_meeting.title}
            scheduledAt={active_meeting.scheduled_at}
            isLive={new Date(active_meeting.scheduled_at) <= new Date()}
          />

          {/* 3. QUORUM WIDGET */}
          <LiveQuorumWidget quorum={active_meeting.quorum} />

          {/* 4. ATTENDANCE PANEL */}
          <LiveAttendancePanel
            meetingId={active_meeting.id}
            remoteCount={active_meeting.quorum.remote_voters}
            liveCount={active_meeting.quorum.live_attendees}
            totalMembers={active_meeting.quorum.total_members}
          />

          {/* 6. PROCEDURAL ITEMS (1-3) - Quick status view */}
          <ProceduralItemsPanel
            items={agenda_items.filter((item) => item.is_procedural)}
            meetingId={active_meeting.id}
            orgSlug={slug}
            sequenceCompleted={active_meeting.procedural_sequence.completed}
          />

          {/* 7. FULL AGENDA - All items with actions */}
          <ChairAgendaPanel
            items={agenda_items}
            meetingId={active_meeting.id}
            orgSlug={slug}
            proceduralSequenceCompleted={active_meeting.procedural_sequence.completed}
          />

          {/* 8. CLOSE VOTES */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Balsavimų valdymas</CardTitle>
            </CardHeader>
            <CardContent>
              <CloseVotesButton
                meetingId={active_meeting.id}
                openVotesCount={active_meeting.open_votes_count}
              />
            </CardContent>
          </Card>

          {/* 10. PROTOCOL */}
          <ProtocolPanel
            meetingId={active_meeting.id}
            orgSlug={slug}
            protocolSigned={active_meeting.completion_validation.checks.protocol_signed}
            gaMode={ga_mode}
          />

          {/* 11. COMPLETION */}
          <GACompletionPanel
            meetingId={active_meeting.id}
            orgSlug={slug}
            completionValidation={active_meeting.completion_validation}
          />
        </>
      ) : (
        <Alert>
          <AlertDescription>
            Nėra aktyvių GA susirinkimų. Sukurkite naują susirinkimą.
          </AlertDescription>
        </Alert>
      )}

      {/* Back link */}
      <div className="text-center">
        <Link href={`/dashboard/${slug}`} className="text-sm text-blue-600 hover:underline">
          ← Grįžti į pagrindinį dashboard
        </Link>
      </div>
    </div>
  )
}
