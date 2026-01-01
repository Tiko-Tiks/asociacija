'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, User, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'

interface CommunityApplication {
  id: string
  communityName: string
  contactPerson: string | null
  email: string
  description: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS'
  created_at: string
}

interface CommunityApplicationsListProps {
  initialApplications?: CommunityApplication[]
}

export function CommunityApplicationsList({ initialApplications = [] }: CommunityApplicationsListProps) {
  const [applications, setApplications] = useState<CommunityApplication[]>(initialApplications)
  const [loading, setLoading] = useState(false)

  const loadApplications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/community-applications')
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialApplications.length === 0) {
      loadApplications()
    }
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Laukia</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Vykdoma</Badge>
      case 'APPROVED':
        return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Patvirtinta</Badge>
      case 'REJECTED':
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Atmesta</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('lt-LT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bendruomenių Registracijos</CardTitle>
          <CardDescription>Kraunama...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bendruomenių Registracijos</CardTitle>
          <CardDescription>Nėra registracijų užklausų</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            Kai bus pateiktos naujos registracijos, jos bus rodomos čia.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bendruomenių Registracijos</CardTitle>
            <CardDescription>
              {applications.length} {applications.length === 1 ? 'registracija' : 'registracijos'}
            </CardDescription>
          </div>
          <Button onClick={loadApplications} variant="outline" size="sm">
            Atnaujinti
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-100">{app.communityName}</h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      {app.contactPerson && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{app.contactPerson}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{app.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(app.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {app.description && (
                <CardContent className="pt-0">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-300">{app.description}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

