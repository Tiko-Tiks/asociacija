"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AuditLogWithUser, listAuditLogs } from '@/app/actions/audit-logs'

interface AuditLogsClientProps {
  logs: AuditLogWithUser[]
  total: number
  isOwner: boolean
  orgId: string
}

const ITEMS_PER_PAGE = 50

export function AuditLogsClient({ logs: initialLogs, total: initialTotal, isOwner, orgId }: AuditLogsClientProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [logs, setLogs] = useState(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  // Fetch logs when page changes
  useEffect(() => {
    if (currentPage === 1) {
      // First page already loaded
      return
    }

    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const offset = (currentPage - 1) * ITEMS_PER_PAGE
        const result = await listAuditLogs(orgId, ITEMS_PER_PAGE, offset)
        setLogs(result.logs)
        setTotal(result.total)
      } catch (error) {
        console.error('Error fetching audit logs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [currentPage, orgId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('lt-LT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAction = (action: string) => {
    // Convert action names to readable Lithuanian
    const actionMap: Record<string, string> = {
      'MEMBER_STATUS_CHANGE': 'Nario statuso keitimas',
      'POSITION_ASSIGNED': 'Pareigų priskyrimas',
      'RESOLUTION_CREATED': 'Sprendimo sukūrimas',
      'RESOLUTION_APPROVED': 'Sprendimo patvirtinimas',
      'RESOLUTION_REJECTED': 'Sprendimo atmetimas',
    }
    return actionMap[action] || action
  }

  const formatChanges = (oldValue: any, newValue: any) => {
    if (!oldValue && !newValue) {
      return '-'
    }

    if (!oldValue) {
      // New record
      return `Sukurta: ${JSON.stringify(newValue, null, 2)}`
    }

    if (!newValue) {
      // Deleted record
      return `Pašalinta: ${JSON.stringify(oldValue, null, 2)}`
    }

    // Changed record - show key differences
    const changes: string[] = []
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])

    for (const key of allKeys) {
      const oldVal = oldValue[key]
      const newVal = newValue[key]

      if (oldVal !== newVal) {
        changes.push(`${key}: ${oldVal ?? 'null'} → ${newVal ?? 'null'}`)
      }
    }

    return changes.length > 0 ? changes.join(', ') : 'Nėra pakeitimų'
  }

  if (!isOwner) {
    return (
      <div className="p-6">
        <div className="rounded-md border bg-slate-50 p-8 text-center">
          <p className="text-lg font-medium text-slate-900 mb-2">
            Prieiga uždrausta
          </p>
          <p className="text-muted-foreground">
            Tik organizacijos savininkai gali peržiūrėti auditą.
          </p>
        </div>
      </div>
    )
  }

  if (logs.length === 0 && !isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Audito žurnalas</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visi organizacijos veiksmai ir pakeitimai
          </p>
        </div>

        <div className="rounded-md border bg-slate-50 p-8 text-center">
          <p className="text-muted-foreground">
            Audito įrašų nėra
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Audito žurnalas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Visi organizacijos veiksmai ir pakeitimai
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Iš viso įrašų: {total}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Data</TableHead>
              <TableHead className="w-[200px]">Vartotojas</TableHead>
              <TableHead className="w-[200px]">Veiksmas</TableHead>
              <TableHead className="w-[150px]">Lentelė</TableHead>
              <TableHead>Pakeitimai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Kraunama...
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user_email || log.user_id}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatAction(log.action)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.target_table}
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-md">
                    <div className="truncate" title={formatChanges(log.old_value, log.new_value)}>
                      {formatChanges(log.old_value, log.new_value)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Simple Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Puslapis {currentPage} iš {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Ankstesnis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Kitas
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
