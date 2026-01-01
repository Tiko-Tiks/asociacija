import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, FileText, Euro } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface MonitoringColumnProps {
  activeMembers: number
  pendingMembers: number
  activeResolutions: number
  unpaidInvoices: number | null
}

export function MonitoringColumn({
  activeMembers,
  pendingMembers,
  activeResolutions,
  unpaidInvoices,
}: MonitoringColumnProps) {
  return (
    <div className="space-y-4">
      {/* Active Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Aktyvūs nariai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{activeMembers}</p>
        </CardContent>
      </Card>

      {/* Pending Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-amber-600" />
            Laukia patvirtinimo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{pendingMembers}</p>
        </CardContent>
      </Card>

      {/* Active Resolutions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            Aktyvūs nutarimai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-slate-900">{activeResolutions}</p>
        </CardContent>
      </Card>

      {/* Unpaid Invoices - only show if table exists */}
      {unpaidInvoices !== null && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Euro className="h-4 w-4 text-red-600" />
              Neapmokėti sąskaitos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{unpaidInvoices}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function MonitoringColumnSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

