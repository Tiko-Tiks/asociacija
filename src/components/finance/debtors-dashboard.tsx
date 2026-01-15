'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertCircle, Mail, CheckCircle, Clock, XCircle } from 'lucide-react'
import { getMemberDebts, getDebtSummary, sendPaymentReminder, type MemberDebt } from '@/app/actions/debtors'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'

interface DebtorsDashboardProps {
  orgId: string
  orgSlug: string
}

export function DebtorsDashboard({ orgId, orgSlug }: DebtorsDashboardProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<MemberDebt[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [orgId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [debtsData, summaryData] = await Promise.all([
        getMemberDebts(orgId),
        getDebtSummary(orgId),
      ])
      setDebts(debtsData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading debtor data:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti skolininkų duomenų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendReminder = async (membershipId: string, memberName: string | null) => {
    try {
      setSending(membershipId)
      await sendPaymentReminder(membershipId, orgId)
      toast({
        title: 'Priminimas išsiųstas',
        description: `Priminimas išsiųstas ${memberName || 'nariui'}`,
      })
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Nepavyko išsiųsti priminimo',
        variant: 'destructive',
      })
    } finally {
      setSending(null)
    }
  }

  const getStatusBadge = (debtStatus: string) => {
    switch (debtStatus) {
      case 'DEBTOR':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Vėluoja
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Laukiama
          </Badge>
        )
      case 'PAID_UP':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Sumokėta
          </Badge>
        )
      default:
        return <Badge variant="outline">-</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Viso narių</CardDescription>
              <CardTitle className="text-3xl">{summary.total_members}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Skolininkai</CardDescription>
              <CardTitle className="text-3xl text-red-600">{summary.debtors}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Laukiama apmokėjimo</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{summary.pending}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Bendra skola</CardDescription>
              <CardTitle className="text-3xl">€{summary.total_outstanding.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Debtors Alert */}
      {summary && summary.debtors > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{summary.debtors}</strong> narių turi vėluojančių mokėjimų.
            {summary.total_overdue_invoices > 0 && (
              <> Viso <strong>{summary.total_overdue_invoices}</strong> vėluojančių sąskaitų.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Debtors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Narių mokėjimų būklė</CardTitle>
          <CardDescription>
            Visų aktyvių narių mokėjimų ataskaita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Narys</TableHead>
                <TableHead>Būklė</TableHead>
                <TableHead className="text-right">Vėluojančių</TableHead>
                <TableHead className="text-right">Laukiama</TableHead>
                <TableHead className="text-right">Skola</TableHead>
                <TableHead>Seniausias vėlavimas</TableHead>
                <TableHead className="text-center">Balsuoja?</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Narių nerasta
                  </TableCell>
                </TableRow>
              ) : (
                debts.map((debt) => (
                  <TableRow key={debt.membership_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{debt.full_name || 'Nežinomas'}</div>
                        <div className="text-xs text-muted-foreground">{debt.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(debt.debt_status)}</TableCell>
                    <TableCell className="text-right">
                      {debt.overdue_count > 0 ? (
                        <span className="text-red-600 font-semibold">{debt.overdue_count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {debt.pending_count > 0 ? (
                        <span className="text-orange-600">{debt.pending_count}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {debt.total_debt > 0 ? (
                        <span className={debt.debt_status === 'DEBTOR' ? 'text-red-600' : ''}>
                          €{debt.total_debt.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {debt.oldest_overdue_date ? (
                        <span className="text-xs text-red-600">
                          {format(new Date(debt.oldest_overdue_date), 'yyyy-MM-dd', { locale: lt })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {debt.can_vote ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {debt.debt_status !== 'PAID_UP' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendReminder(debt.membership_id, debt.full_name)}
                          disabled={sending === debt.membership_id}
                          className="gap-2"
                        >
                          <Mail className="h-4 w-4" />
                          {sending === debt.membership_id ? 'Siunčiama...' : 'Priminti'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Būklių paaiškinimai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Vėluoja
            </Badge>
            <span className="text-muted-foreground">
              - Turi vėluojančių (OVERDUE) sąskaitų, gali būti blokuojamas balsavimas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Laukiama
            </Badge>
            <span className="text-muted-foreground">
              - Turi išsiųstų (SENT) sąskaitų, dar nevėluoja
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" />
              Sumokėta
            </Badge>
            <span className="text-muted-foreground">- Visos sąskaitos apmokėtos</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

