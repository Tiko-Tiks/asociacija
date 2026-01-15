/**
 * CHAIR STATUS BAR
 * 
 * Atsakomybė:
 * - Rodo GA_MODE
 * - Rodo meeting status
 * - Rodo user role
 * 
 * ❌ Jokio veiksmo
 * ❌ Jokio mygtuko
 */

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface ChairStatusBarProps {
  orgName: string
  gaMode: 'TEST' | 'PRODUCTION'
  meetingStatus?: string
  userRole: string
}

export function ChairStatusBar({
  orgName,
  gaMode,
  meetingStatus,
  userRole,
}: ChairStatusBarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pirmininko pultas</h1>
            <p className="text-sm text-muted-foreground">{orgName}</p>
            {meetingStatus && (
              <p className="mt-1 text-sm">
                Susirinkimo būsena: <span className="font-medium">{meetingStatus}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{userRole}</Badge>
            <Badge variant={gaMode === 'PRODUCTION' ? 'default' : 'secondary'}>
              {gaMode === 'PRODUCTION' ? '🔴 PRODUCTION' : '🟢 TEST'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

