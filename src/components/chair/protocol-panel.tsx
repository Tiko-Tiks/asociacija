/**
 * PROTOCOL PANEL
 * 
 * Atsakomybė:
 * - Generuoti protokolo juodraštį (PDF)
 * - Upload signed protocol
 * - Rodo būseną
 * 
 * ❌ Jokio inline edit
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface ProtocolPanelProps {
  meetingId: string
  orgSlug: string
  protocolSigned: boolean
  gaMode: 'TEST' | 'PRODUCTION'
}

export function ProtocolPanel({
  meetingId,
  orgSlug,
  protocolSigned,
  gaMode,
}: ProtocolPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📄 Protokolas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generate button */}
        <div>
          <Button asChild className="w-full" size="lg">
            <Link href={`/dashboard/${orgSlug}/meetings/${meetingId}/protocol`}>
              Generuoti protokolo juodraštį (PDF)
            </Link>
          </Button>
        </div>

        {/* Upload button */}
        <div>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/dashboard/${orgSlug}/meetings/${meetingId}/protocol/upload`}>
              ⬆️ Įkelti pasirašytą protokolą
            </Link>
          </Button>
        </div>

        {/* Status */}
        {protocolSigned ? (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ Pasirašytas protokolas įkeltas
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              {gaMode === 'PRODUCTION' ? (
                <>
                  ⚠️ <strong>PRODUCTION režimas:</strong> Pasirašytas protokolas PRIVALOMAS
                  užbaigti GA
                </>
              ) : (
                <>⚠️ Pasirašytas protokolas dar nėra (optional TEST režimui)</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

