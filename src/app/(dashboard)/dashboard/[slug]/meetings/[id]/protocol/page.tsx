/**
 * PROTOCOL PAGE
 * 
 * Puslapis protokolo generavimui ir peržiūrai.
 * 
 * @version 18.8.6
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProtocolActions } from '@/components/protocols/protocol-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface ProtocolPageProps {
  params: {
    slug: string
    id: string
  }
}

export default async function ProtocolPage({ params }: ProtocolPageProps) {
  const { slug, id: meetingId } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user has access to this meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      id,
      title,
      status,
      org_id,
      orgs (
        id,
        slug,
        name
      )
    `)
    .eq('id', meetingId)
    .single()

  if (!meeting || (meeting.orgs as any)?.slug !== slug) {
    redirect(`/dashboard/${slug}`)
  }

  // Check membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', meeting.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership) {
    redirect(`/dashboard/${slug}`)
  }

  const isOwner = membership.role === 'OWNER'
  const isBoard = membership.role === 'BOARD' || membership.role === 'OWNER'

  return (
    <div className="container mx-auto max-w-4xl space-y-6 py-8">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/${slug}/chair`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Grįžti į pirmininko pultą
          </Link>
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">📄 Protokolo generavimas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Susirinkimas:</strong> {meeting.title}</p>
            <p><strong>Statusas:</strong> {meeting.status}</p>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Actions Component - includes preview, finalize, and PDF generation */}
      <ProtocolActions 
        meetingId={meetingId} 
        orgId={meeting.org_id}
        orgSlug={slug}
        isOwner={isOwner}
        isBoard={isBoard}
      />
    </div>
  )
}

