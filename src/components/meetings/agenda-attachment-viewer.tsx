'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { getAgendaAttachmentSignedUrl } from '@/app/actions/meetings'
import type { AgendaAttachment } from '@/app/actions/meetings'
import { useToast } from '@/components/ui/use-toast'

interface AgendaAttachmentViewerProps {
  attachment: AgendaAttachment
  isOpen: boolean
  onClose: () => void
}

export function AgendaAttachmentViewer({
  attachment,
  isOpen,
  onClose,
}: AgendaAttachmentViewerProps) {
  const { toast } = useToast()
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load signed URL when dialog opens
  useEffect(() => {
    if (isOpen && !signedUrl) {
      loadSignedUrl()
    }
    // Reset when dialog closes
    if (!isOpen) {
      setSignedUrl(null)
      setError(null)
      setLoading(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const loadSignedUrl = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAgendaAttachmentSignedUrl(attachment.id)
      if (result.success && result.url) {
        setSignedUrl(result.url)
      } else {
        setError(result.error || 'Nepavyko įkelti failo')
      }
    } catch (err) {
      console.error('Error loading attachment:', err)
      setError('Įvyko klaida įkeliant failą')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    }
  }

  const getFileType = () => {
    if (!attachment.mime_type) return 'unknown'
    if (attachment.mime_type.startsWith('image/')) return 'image'
    if (attachment.mime_type === 'application/pdf') return 'pdf'
    if (attachment.mime_type.startsWith('text/')) return 'text'
    return 'other'
  }

  const fileType = getFileType()
  const isImage = fileType === 'image'
  const isPdf = fileType === 'pdf'
  const isText = fileType === 'text'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                {isPdf && <FileText className="h-5 w-5" />}
                {isImage && <ImageIcon className="h-5 w-5" />}
                {!isPdf && !isImage && <File className="h-5 w-5" />}
                {attachment.file_name}
              </DialogTitle>
              <DialogDescription>
                {attachment.size_bytes ? (
                  <span className="text-xs text-slate-500">
                    Dydis: {(attachment.size_bytes / 1024).toFixed(1)} KB
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Priedas</span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Atsisiųsti
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-2"></div>
                <p className="text-sm text-slate-600">Įkeliamas failas...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={loadSignedUrl}>
                  Bandyti dar kartą
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && signedUrl && (
            <>
              {isPdf && (
                <iframe
                  src={signedUrl}
                  className="w-full h-full min-h-[600px] border border-slate-200 dark:border-slate-700 rounded"
                  title={attachment.file_name}
                />
              )}

              {isImage && (
                <div className="flex items-center justify-center">
                  <img
                    src={signedUrl}
                    alt={attachment.file_name}
                    className="max-w-full max-h-[70vh] object-contain rounded border border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {isText && (
                <div className="border border-slate-200 dark:border-slate-700 rounded p-4 bg-slate-50 dark:bg-slate-900">
                  <iframe
                    src={signedUrl}
                    className="w-full h-full min-h-[400px] border-0"
                    title={attachment.file_name}
                  />
                </div>
              )}

              {!isPdf && !isImage && !isText && (
                <div className="flex items-center justify-center h-64 border border-slate-200 dark:border-slate-700 rounded">
                  <div className="text-center">
                    <File className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Šio tipo failo negalima peržiūrėti tiesiai ekrane
                    </p>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Atsisiųsti failą
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

