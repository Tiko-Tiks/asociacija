"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"
import { format } from "date-fns"
import { lt } from "date-fns/locale"
import { listBusinessEvents } from '@/app/actions/history'

interface BusinessEvent {
  id: string
  event_type: string
  actor_user_id: string
  actor_name: string | null
  payload: Record<string, unknown>
  created_at: string
}

interface AuditLogData {
  events: BusinessEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface AuditLogClientProps {
  initialData: AuditLogData
  membershipId: string
  orgSlug: string
}

export function AuditLogClient({
  initialData,
  membershipId,
  orgSlug,
}: AuditLogClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const currentPage = data.page

  useEffect(() => {
    setData(initialData)
  }, [initialData])

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > data.totalPages || newPage === currentPage) {
      return
    }

    setIsLoading(true)
    try {
      const newData = await listBusinessEvents(membershipId, newPage, 50)
      setData(newData)
      
      // Update URL with new page
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', newPage.toString())
      router.push(`/dashboard/${orgSlug}/history?${params.toString()}`)
    } catch (error) {
      console.error('Failed to load page:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getEventTypeBadgeVariant = (eventType: string): "default" | "secondary" | "destructive" | "outline" | "success" => {
    // Color code critical events
    if (
      eventType.includes('VIOLATION') ||
      eventType.includes('ERROR') ||
      eventType === 'CROSS_ORG_VIOLATION'
    ) {
      return 'destructive'
    }
    if (eventType.includes('CREATE') || eventType.includes('APPROVE')) {
      return 'success'
    }
    return 'default'
  }

  const formatPayload = (payload: Record<string, unknown>): string => {
    try {
      // Format as simplified key-value pairs
      const entries = Object.entries(payload)
      if (entries.length === 0) {
        return '-'
      }
      return entries
        .map(([key, value]) => {
          const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
          return `${key}: ${valueStr}`
        })
        .join(', ')
    } catch {
      return JSON.stringify(payload)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Istorija</h1>
        <p className="mt-1 text-sm text-slate-600">
          Veiksmų ir įvykių žurnalas
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Data</TableHead>
              <TableHead className="w-[200px]">Veiksmas</TableHead>
              <TableHead className="w-[180px]">Vartotojas</TableHead>
              <TableHead>Detalės</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>Įvykių nėra</p>
                </TableCell>
              </TableRow>
            ) : (
              data.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-sm">
                    {format(new Date(event.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getEventTypeBadgeVariant(event.event_type)}>
                      {event.event_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.actor_name || event.actor_user_id || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                    {formatPayload(event.payload)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Rodoma {((currentPage - 1) * data.pageSize) + 1}-{Math.min(currentPage * data.pageSize, data.total)} iš {data.total}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Ankstesnis
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum: number
                if (data.totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isLoading}
                    className="min-w-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === data.totalPages || isLoading}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Kitas
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

