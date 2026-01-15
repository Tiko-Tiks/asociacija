/**
 * LIVE QUORUM WIDGET (KRITINIS)
 * 
 * Atsakomybė:
 * - Rodo quorum snapshot (read-only)
 * - NO double counting
 * - Tik skaičiai iš backend
 * 
 * ⚠️ Tai nėra balsavimas
 * ⚠️ Tik snapshot, be edit
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LiveQuorumWidgetProps {
  quorum: {
    total_members: number
    quorum_required: number
    remote_voters: number
    live_attendees: number
    total_participants: number
    quorum_met: boolean
    missing_count: number
  }
}

export function LiveQuorumWidget({ quorum }: LiveQuorumWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Kvorumas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Numbers grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Aktyvūs nariai</div>
            <div className="text-3xl font-bold">{quorum.total_members}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Reikalingas kvorumas (50%)</div>
            <div className="text-3xl font-bold">{quorum.quorum_required}</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">☁️ Balsavę nuotoliniu būdu:</span>
            <span className="font-medium">{quorum.remote_voters}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">🏢 Dalyvaujantys gyvai:</span>
            <span className="font-medium">{quorum.live_attendees}</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>IŠ VISO (be dubliavimo):</span>
            <span className="text-lg">{quorum.total_participants}</span>
          </div>
        </div>

        {/* Status */}
        {quorum.quorum_met ? (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ Kvorumas pasiektas (+
              {quorum.total_participants - quorum.quorum_required})
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              ⚠️ Trūksta dar {quorum.missing_count} narių kvorumui
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

