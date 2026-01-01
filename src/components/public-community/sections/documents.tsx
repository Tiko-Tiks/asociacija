import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { lt } from 'date-fns/locale'
import Link from 'next/link'

interface CommunityDocumentsProps {
  documents: Array<{
    id: string
    title: string
    url: string
    document_type: string
    created_at: string
  }>
}

/**
 * Documents Section
 * 
 * Public documents:
 * - Statutes
 * - Internal rules
 * - Public protocols
 * 
 * Structure:
 * - Title
 * - File (PDF)
 * - Date
 * 
 * Security:
 * - Only public documents
 * - No internal information
 */
export function CommunityDocuments({ documents }: CommunityDocumentsProps) {
  if (documents.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Dokumentai</h2>
        <div className="rounded-lg border bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            Viešų dokumentų dar nėra. Dokumentai bus pridėti netrukus.
          </p>
        </div>
      </div>
    )
  }

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.document_type || 'KITI'
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(doc)
    return acc
  }, {} as Record<string, typeof documents>)

  const documentTypeLabels: Record<string, string> = {
    STATUTES: 'Įstatai',
    INTERNAL_RULES: 'Vidaus taisyklės',
    PROTOCOL: 'Protokolai',
    KITI: 'Kiti dokumentai',
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-slate-900">Dokumentai</h2>
      
      {Object.entries(groupedDocs).map(([type, docs]) => (
        <section key={type} className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">
            {documentTypeLabels[type] || type}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.map((doc) => {
              const formattedDate = doc.created_at
                ? format(new Date(doc.created_at), 'yyyy-MM-dd', { locale: lt })
                : ''

              return (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2">
                          {doc.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <time dateTime={doc.created_at}>{formattedDate}</time>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Atsisiųsti PDF
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

