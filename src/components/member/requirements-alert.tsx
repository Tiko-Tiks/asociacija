"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, Info, ChevronRight, X } from 'lucide-react'
import { MemberRequirement } from '@/app/actions/member-requirements'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Link from 'next/link'

interface RequirementsAlertProps {
  requirements: MemberRequirement[]
  orgId: string
  orgSlug?: string
}

export function RequirementsAlert({ requirements, orgId, orgSlug }: RequirementsAlertProps) {
  const [selectedRequirement, setSelectedRequirement] = useState<MemberRequirement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  if (requirements.length === 0) {
    return null
  }

  // Filter out dismissed requirements
  const visibleRequirements = requirements.filter((req) => !dismissedIds.has(req.id))

  if (visibleRequirements.length === 0) {
    return null
  }

  const handleRequirementClick = (requirement: MemberRequirement) => {
    setSelectedRequirement(requirement)
    setIsModalOpen(true)
  }

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedIds((prev) => new Set([...prev, id]))
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error':
        return <Badge variant="destructive">Kritinis</Badge>
      case 'warning':
        return <Badge variant="outline" className="border-amber-600 text-amber-700">Įspėjimas</Badge>
      default:
        return <Badge variant="secondary">Informacija</Badge>
    }
  }

  // Sort by severity: error first, then warning, then info
  const sortedRequirements = [...visibleRequirements].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return (
    <>
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Reikalavimai ir priminimai
          </CardTitle>
          <CardDescription>
            Prašome atlikti šiuos veiksmus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedRequirements.map((requirement) => (
              <div
                key={requirement.id}
                onClick={() => handleRequirementClick(requirement)}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(requirement.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-medium text-slate-900 group-hover:text-slate-700">
                      {requirement.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(requirement.severity)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDismiss(requirement.id, e)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {requirement.description}
                  </p>
                  {requirement.actionUrl && (
                    <Link
                      href={requirement.actionUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {requirement.actionLabel || 'Peržiūrėti'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedRequirement && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getSeverityIcon(selectedRequirement.severity)}
                {selectedRequirement.title}
              </DialogTitle>
              <DialogDescription>
                {getSeverityBadge(selectedRequirement.severity)}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-slate-700 mb-4">
                  {selectedRequirement.description}
                </p>
              </div>

              {/* Show detailed information based on requirement type */}
              {selectedRequirement.type === 'PROFILE_INCOMPLETE' && selectedRequirement.metadata?.missingFields && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Trūkstami laukai:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                    {selectedRequirement.metadata.missingFields.map((field: string, index: number) => (
                      <li key={index}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRequirement.type === 'OVERDUE_INVOICE' && selectedRequirement.metadata?.invoices && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">
                    Vėluojančios sąskaitos ({selectedRequirement.metadata.count})
                  </h4>
                  <div className="space-y-2">
                    {selectedRequirement.metadata.invoices.map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <p className="font-medium text-sm">{invoice.title}</p>
                          <p className="text-xs text-slate-600">
                            Terminas: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('lt-LT') : 'Nenurodytas'}
                          </p>
                        </div>
                        <p className="font-semibold text-red-600">
                          {invoice.amount.toFixed(2)} €
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequirement.type === 'UNPAID_INVOICE' && selectedRequirement.metadata?.invoices && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-3">
                    Laukiančios sąskaitos ({selectedRequirement.metadata.count})
                  </h4>
                  <div className="space-y-2">
                    {selectedRequirement.metadata.invoices.map((invoice: any) => (
                      <div key={invoice.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <p className="font-medium text-sm">{invoice.title}</p>
                          <p className="text-xs text-slate-600">
                            Terminas: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('lt-LT') : 'Nenurodytas'}
                          </p>
                        </div>
                        <p className="font-semibold text-amber-700">
                          {invoice.amount.toFixed(2)} €
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequirement.actionUrl && (
                <div className="pt-4 border-t">
                  <Link href={selectedRequirement.actionUrl}>
                    <Button className="w-full">
                      {selectedRequirement.actionLabel || 'Peržiūrėti'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

