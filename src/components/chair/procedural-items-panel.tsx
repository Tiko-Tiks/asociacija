/**
 * PROCEDURAL ITEMS PANEL (1-3)
 * 
 * Atsakomybė:
 * - Rodo procedūrinių klausimų būseną
 * - Locked/Unlocked indikacija
 * - Link į detalų valdymą
 * 
 * ❌ Jokio inline balsavimo
 * ❌ Jokio statusų keitimo
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ProceduralItem {
  id: string
  item_no: string
  title: string
  resolution_status: string | null
  vote_id: string | null
  vote_status: string | null
}

interface ProceduralItemsPanelProps {
  items: ProceduralItem[]
  meetingId: string
  orgSlug: string
  sequenceCompleted: boolean
}

export function ProceduralItemsPanel({
  items,
  meetingId,
  orgSlug,
  sequenceCompleted,
}: ProceduralItemsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🏛️ Procedūriniai klausimai (1-3)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items list */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {item.item_no}. {item.title}
                </div>
                <div className="text-sm text-muted-foreground">
                  Balsavimas: {item.vote_status || 'N/A'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.resolution_status === 'APPROVED' ? (
                  <Badge className="bg-green-600">✅ PRIIMTA</Badge>
                ) : item.resolution_status === 'REJECTED' ? (
                  <Badge variant="destructive">❌ ATMESTA</Badge>
                ) : (
                  <Badge variant="secondary">⏳ LAUKIAMA</Badge>
                )}
                {item.vote_id && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/${orgSlug}/governance/${meetingId}#item-${item.id}`}>
                      Valdyti
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sequence status */}
        {!sequenceCompleted && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              ⚠️ Procedūrinė eiga neužbaigta. Esminiai klausimai (4+) užrakinti, kol
              nepatvirtinti visi procedūriniai.
            </AlertDescription>
          </Alert>
        )}

        {sequenceCompleted && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              ✅ Procedūrinė eiga užbaigta. Galima tęsti esminius klausimus.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

