'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import { Eye, CheckCircle2, XCircle, MessageSquare } from 'lucide-react'
import type { OrgReviewRequest } from '@/app/actions/admin/org-review'
import { OrgReviewRequestDetail } from './org-review-request-detail'

interface OrgReviewRequestsListProps {
  initialRequests: OrgReviewRequest[]
}

export function OrgReviewRequestsList({ initialRequests }: OrgReviewRequestsListProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [selectedRequest, setSelectedRequest] = useState<OrgReviewRequest | null>(null)

  const openRequests = requests.filter((r) => r.status === 'OPEN')
  const needsChanges = requests.filter((r) => r.status === 'NEEDS_CHANGES')
  const approved = requests.filter((r) => r.status === 'APPROVED')
  const rejected = requests.filter((r) => r.status === 'REJECTED')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default">Laukia patvirtinimo</Badge>
      case 'NEEDS_CHANGES':
        return <Badge variant="secondary">Reikia pataisymų</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Patvirtinta</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Atmesta</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Open Requests */}
        {openRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Laukia patvirtinimo ({openRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{request.org_name}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>
                          Pateikta: {format(new Date(request.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                        </p>
                        {request.requester_name && (
                          <p>Pateikė: {request.requester_name} ({request.requester_email})</p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Peržiūrėti
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Needs Changes */}
        {needsChanges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Reikia pataisymų ({needsChanges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsChanges.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{request.org_name}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>
                          Pateikta: {format(new Date(request.created_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Peržiūrėti
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Patvirtintos ({approved.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {approved.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{request.org_name}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-slate-600">
                        {request.decided_at && (
                          <p>
                            Patvirtinta: {format(new Date(request.decided_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Peržiūrėti
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Atmestos ({rejected.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rejected.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{request.org_name}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="text-sm text-slate-600">
                        {request.decided_at && (
                          <p>
                            Atmesta: {format(new Date(request.decided_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Peržiūrėti
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {requests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Nėra užklausų
            </CardContent>
          </Card>
        )}
      </div>

      {selectedRequest && (
        <OrgReviewRequestDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={(updated) => {
            setRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
            setSelectedRequest(updated)
          }}
        />
      )}
    </>
  )
}

