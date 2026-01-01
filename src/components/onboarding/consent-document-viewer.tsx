"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, FileText } from 'lucide-react'

interface ConsentDocumentViewerProps {
  consentType: string
  isOpen: boolean
  onClose: () => void
}

const DOCUMENT_PATHS: Record<string, string> = {
  CORE_STATUTES: '/documents/branduolio-asociacijos-istatai.md',
  CHARTER: '/documents/platformos-chartija.md',
  TERMS: '/documents/platformos-naudojimo-taisykles.md',
  PRIVACY: '/documents/platformos-privatumo-politika.md',
}

const DOCUMENT_TITLES: Record<string, string> = {
  CORE_STATUTES: 'Bendruomenių Branduolio Asociacijos Įstatų',
  CHARTER: 'Platformos Chartija',
  TERMS: 'Platformos Naudojimo Taisyklės Bendruomenėms',
  PRIVACY: 'Privatumo Politika',
}

export function ConsentDocumentViewer({
  consentType,
  isOpen,
  onClose,
}: ConsentDocumentViewerProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const documentPath = DOCUMENT_PATHS[consentType]
    if (!documentPath) {
      setError('Dokumentas nerastas')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch(documentPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Nepavyko įkelti dokumento')
        }
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading document:', err)
        setError('Nepavyko įkelti dokumento. Bandykite vėliau.')
        setLoading(false)
      })
  }, [consentType, isOpen])

  const title = DOCUMENT_TITLES[consentType] || 'Dokumentas'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Perskaitykite dokumentą prieš priimdami sutikimą
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}

          {error && (
            <div className="py-12 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <p className="text-sm text-slate-600">
                Dokumentas bus prieinamas netrukus. Galite tęsti sutikimo priėmimą.
              </p>
            </div>
          )}

          {!loading && !error && content && (
            <div className="prose prose-slate max-w-none py-4">
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ 
                  __html: content
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                    .replace(/\n/g, '<br />')
                }}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Uždaryti</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

