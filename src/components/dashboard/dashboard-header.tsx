import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import { createGreetingFromFullName } from '@/lib/vocative'

interface DashboardHeaderProps {
  userName: string | null
  orgName: string
  orgStatus: string | null
}

/**
 * Dashboard Header Component
 * 
 * "Hello, Chairman" section with:
 * - Greeting with vocative case: "Laba diena, Giedriau" (not "Giedrius")
 * - Date: Today's date (Lithuanian locale)
 * - Compliance Badge: "Sertifikuota" (Green) or "Dėmesio" (Yellow)
 */
export function DashboardHeader({ userName, orgName, orgStatus }: DashboardHeaderProps) {
  const today = format(new Date(), 'EEEE, yyyy-MM-dd', { locale: lt })
  const isCompliant = orgStatus === 'ACTIVE'
  
  // Use vocative case for greeting (e.g., "Giedrius" → "Giedriau")
  const greeting = createGreetingFromFullName(userName, true)

  return (
    <div className="space-y-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {greeting}
          </h1>
          <p className="text-lg text-slate-600">
            {orgName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-slate-600">{today}</p>
          </div>
          <Badge
            variant={isCompliant ? 'default' : 'secondary'}
            className={
              isCompliant
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }
          >
            {isCompliant ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Sertifikuota
              </>
            ) : (
              <>
                <AlertTriangle className="mr-1 h-3 w-3" />
                Dėmesio
              </>
            )}
          </Badge>
        </div>
      </div>
    </div>
  )
}

