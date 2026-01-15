/**
 * PROTOCOL UPLOAD PAGE
 * 
 * Puslapis pasirašyto protokolo įkėlimui.
 * 
 * @version 19.0
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { listMeetingProtocols } from '@/app/actions/protocols'
import { ProtocolUploadForm } from '@/components/protocols/protocol-upload-form'

interface ProtocolUploadPageProps {
  params: {
    slug: string
    id: string
  }
}

export default async function ProtocolUploadPage({ params }: ProtocolUploadPageProps) {
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

  // Check membership - only OWNER or BOARD can upload
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', meeting.org_id)
    .eq('user_id', user.id)
    .eq('member_status', 'ACTIVE')
    .single()

  if (!membership || membership.role === 'MEMBER') {
    redirect(`/dashboard/${slug}`)
  }

  // Get FINAL protocol for this meeting
  const protocols = await listMeetingProtocols(meetingId)
  const finalProtocol = protocols.find(p => p.status === 'FINAL')

  if (!finalProtocol) {
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
            <CardTitle className="text-xl">⬆️ Įkelti pasirašytą protokolą</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Susirinkimas neturi finalizuoto protokolo. Pirma reikia finalizuoti protokolą.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center">
          <Link href={`/dashboard/${slug}/meetings/${meetingId}/protocol`} className="text-sm text-blue-600 hover:underline">
            ← Grįžti į protokolo peržiūrą
          </Link>
        </div>
      </div>
    )
  }

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
          <CardTitle className="text-xl">⬆️ Įkelti pasirašytą protokolą</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Susirinkimas:</strong> {meeting.title}</p>
            <p><strong>Statusas:</strong> {meeting.status}</p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pasirašyto protokolo įkėlimas</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Protokolas:</strong> Nr. {finalProtocol.protocol_number}</p>
              <p><strong>Versija:</strong> {finalProtocol.version}</p>
              {finalProtocol.pdf_path && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Pasirašytas protokolas jau įkeltas. Įkėlus naują failą, jis bus pakeistas.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <ProtocolUploadForm 
              protocolId={finalProtocol.id}
              redirectPath={`/dashboard/${slug}/meetings/${meetingId}/protocol`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Back link */}
      <div className="text-center">
        <Link href={`/dashboard/${slug}/meetings/${meetingId}/protocol`} className="text-sm text-blue-600 hover:underline">
          ← Grįžti į protokolo peržiūrą
        </Link>
      </div>
    </div>
  )
}

