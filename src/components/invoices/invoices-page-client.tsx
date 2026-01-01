"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FileText, Plus } from 'lucide-react'
import { INVOICE_STATUS } from '@/app/domain/constants'
import { InvoiceStatus } from '@/app/domain/types'
import { createInvoice } from '@/app/actions/invoices'
import { updateInvoiceStatus } from '@/app/(dashboard)/dashboard/invoices/actions/updateInvoiceStatus'
import { useToast } from '@/components/ui/use-toast'

interface Invoice {
  id: string
  amount: number
  description: string | null
  due_date: string
  status: InvoiceStatus
  member_name: string | null
  membership_id: string
  created_at: string
}

interface InvoicesPageClientProps {
  invoices: Invoice[]
  membershipId: string
  userRole: 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'
  pilotMode?: boolean
}

/**
 * Financial Read-Only View - Facts Register
 * 
 * Displays raw facts only - no aggregations, no calculations, no interpretations:
 * - Direct display of invoice records from database (factual records only)
 * - No client-side filtering or calculations
 * - No recommendations, projections, or management suggestions
 * - No AI, no automation
 * - Strictly read-only, facts-only view
 * 
 * Goal: Members can see how money was actually used (factual records).
 */
export function InvoicesPageClient({
  invoices,
  membershipId,
  userRole,
  pilotMode = false,
}: InvoicesPageClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null)
  const isOwner = userRole === 'OWNER'

  // Debug: Log pilotMode prop received from server (component mount)
  // This helps identify if pilotMode is being passed correctly
  if (typeof window !== 'undefined') {
    console.error('PILOT_CREATE_DEBUG [CLIENT] Component props:', {
      pilotMode,
      isOwner,
      userRole,
      membershipId,
    })
  }

  const handleCreateInvoice = async () => {
    // Pilot mode check - UI-only validation (backend also checks)
    // Allow CREATE when activeOrg.slug is in pilot allowlist (demo-org, mano-bendruomene)
    // This check should match the server-side pilotMode prop passed from page.tsx
    // Note: Button and Sheet are already gated by pilotMode, but this is a safety check
    if (!pilotMode) {
      // Debug: Log why CREATE is blocked
      console.error('PILOT_CREATE_DEBUG [CLIENT] CREATE blocked - pilotMode is false:', {
        pilotMode,
        isOwner,
        userRole,
        urlOrgId: searchParams.get('orgId'),
        membershipId,
      })
      toast({
        title: "Pilot mode not enabled",
        description: "Pilot mode not enabled for this community",
        variant: "destructive" as any,
      })
      return
    }

    // Debug: Log successful CREATE attempt (pilot mode check passed)
    console.error('PILOT_CREATE_DEBUG [CLIENT] CREATE allowed - pilotMode check passed:', {
      pilotMode,
      isOwner,
      userRole,
    })

    if (!amount.trim() || !dueDate.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome užpildyti visus privalomus laukus",
        variant: "destructive" as any,
      })
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Klaida",
        description: "Suma turi būti teigiamas skaičius",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createInvoice(
        membershipId,
        amountNum,
        description.trim(),
        dueDate
      )
      
      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Įrašas sukurtas sėkmingai",
        })
        setIsSheetOpen(false)
        setAmount('')
        setDescription('')
        setDueDate('')
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko sukurti įrašo",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko sukurti įrašo",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAsSent = async (invoiceId: string) => {
    // Status update (DRAFT -> SENT) - Pilot Mode does NOT apply
    // Pilot Mode applies ONLY to CREATE actions, not status transitions
    
    // PILOT_SEND_DEBUG: Log client-side context before calling server action
    const urlOrgId = searchParams.get('orgId')
    console.error('PILOT_SEND_DEBUG [CLIENT] handleMarkAsSent called:', {
      invoiceId,
      pilotMode,
      urlOrgId,
      membershipId,
      userRole,
    })
    
    setUpdatingInvoiceId(invoiceId)
    try {
      const result = await updateInvoiceStatus(invoiceId, INVOICE_STATUS.SENT)
      
      // PILOT_SEND_DEBUG: Log server action result
      console.error('PILOT_SEND_DEBUG [CLIENT] updateInvoiceStatus result:', {
        invoiceId,
        success: result.success,
        error: result.error || null,
      })
      
      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Sąskaita pažymėta kaip išsiųsta",
        })
        router.refresh()
      } else {
        console.error('PILOT_SEND_DEBUG [CLIENT] Server action returned failure:', result)
        toast({
          title: "Klaida",
          description: "Nepavyko atnaujinti sąskaitos statuso",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      console.error('PILOT_SEND_DEBUG [CLIENT] Exception in handleMarkAsSent:', {
        invoiceId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      })
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko atnaujinti sąskaitos statuso",
        variant: "destructive" as any,
      })
    } finally {
      setUpdatingInvoiceId(null)
    }
  }

  const getStatusBadgeVariant = (status: InvoiceStatus) => {
    // Status display is a fact from the database, not a calculation or interpretation
    switch (status) {
      case INVOICE_STATUS.PAID:
        return 'success'
      case INVOICE_STATUS.SENT:
        return 'default'
      case INVOICE_STATUS.OVERDUE:
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Faktų Registras</h1>
            <p className="mt-1 text-sm text-slate-600">
              Sąskaitų faktūrų peržiūra (tik skaityti, tik faktai)
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Rodomi tik faktiniai įrašai iš duomenų bazės. Nėra skaičiavimų, prognozių ar rekomendacijų.
            </p>
          </div>
          {/* Pilot Mode Badge */}
          {pilotMode && isOwner && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              PILOT MODE
            </Badge>
          )}
        </div>
        {isOwner && (
          pilotMode ? (
            <Button
              onClick={() => setIsSheetOpen(true)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Pridėti įrašą
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Button
                disabled
                variant="outline"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Pridėti įrašą
              </Button>
              <p className="text-xs text-muted-foreground">
                Pilot mode not enabled for this community
              </p>
            </div>
          )
        )}
      </div>

      {invoices.length === 0 ? (
        /* Empty state - only show for OWNER, MEMBER sees nothing */
        isOwner && (
          <div className="rounded-lg border bg-card p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Sąskaitų nėra
            </h3>
            <p className="text-sm text-muted-foreground">
              Organizacijos sąskaitų sąrašas tuščias.
            </p>
          </div>
        )
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Narys</TableHead>
                <TableHead>Suma</TableHead>
                <TableHead>Aprašymas</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead>Statusas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.member_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {/* Display amount as-is from database (factual record) */}
                    {invoice.amount.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    {invoice.description || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.due_date).toLocaleDateString('lt-LT', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                      {/* Status update button - Pilot Mode does NOT apply (only CREATE actions are restricted) */}
                      {isOwner && invoice.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsSent(invoice.id)}
                          disabled={updatingInvoiceId === invoice.id}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {updatingInvoiceId === invoice.id ? 'Atnaujinama...' : 'Pažymėti kaip išsiųstą'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Invoice Sheet - only for OWNER in pilot mode */}
      {isOwner && pilotMode && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Pridėti įrašą</SheetTitle>
              <SheetDescription>
                Sukurkite naują finansinį įrašą
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="invoice-amount">
                  Suma <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting}
                  className="mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <Label htmlFor="invoice-description">Aprašymas</Label>
                <Input
                  id="invoice-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Įrašo aprašymas"
                  disabled={isSubmitting}
                  className="mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <Label htmlFor="invoice-date">
                  Data <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                  className="mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateInvoice}
                  disabled={isSubmitting}
                  className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isSubmitting ? "Kuriama..." : "Sukurti"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSheetOpen(false)
                    setAmount('')
                    setDescription('')
                    setDueDate('')
                  }}
                  disabled={isSubmitting}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Atšaukti
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

