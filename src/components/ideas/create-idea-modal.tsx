'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, AlertTriangle } from 'lucide-react'
import { createIdea } from '@/app/actions/ideas'
import { useToast } from '@/components/ui/use-toast'

interface CreateIdeaModalProps {
  orgId: string
  onClose: () => void
}

/**
 * Create Idea Modal
 * 
 * v19.0 COMPLIANT PRE-GOVERNANCE:
 * - Creates idea in draft phase
 * - Uses v19 columns: title, summary, details
 * - Phase stored in metadata.fact.phase
 * - Ideas have no legal or procedural power
 */
export function CreateIdeaModal({ orgId, onClose }: CreateIdeaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    details: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast({
        title: 'Klaida',
        description: 'Pavadinimas yra privalomas',
        variant: 'destructive',
      })
      return
    }

    if (!formData.summary.trim()) {
      toast({
        title: 'Klaida',
        description: 'Trumpas aprašymas yra privalomas',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // v19.0 COMPLIANT: createIdea(orgId, title, summary, details)
      const result = await createIdea(
        orgId,
        formData.title.trim(),
        formData.summary.trim(),
        formData.details.trim() || undefined
      )

      if (result.success) {
        toast({
          title: 'Idėja sukurta',
          description: 'Idėja sukurta kaip juodraštis. Tai yra diskusijų objektas be teisinės galios.',
        })
        onClose()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti idėjos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating idea:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida kuriant idėją',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Sukurti idėją
          </DialogTitle>
          <DialogDescription>
            Sukurkite naują idėją diskusijai. Idėja bus sukurta kaip juodraštis.
          </DialogDescription>
        </DialogHeader>

        {/* PRE-GOVERNANCE Disclaimer */}
        <Alert className="border-gray-200 bg-gray-50">
          <AlertTriangle className="h-4 w-4 text-gray-600" />
          <AlertDescription className="text-gray-600 text-sm">
            Idėjos yra diskusijų objektai be teisinės ar procedūrinės galios. 
            Sprendimai priimami tik Valdymo modulyje.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Pavadinimas *</Label>
            <Input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Įveskite idėjos pavadinimą"
              disabled={loading}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Trumpas aprašymas *</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Trumpai aprašykite idėją (bus rodoma sąraše)..."
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Išsamus aprašymas (neprivaloma)</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="Išsamiai aprašykite idėją, pateikite argumentus..."
              disabled={loading}
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Atšaukti
            </Button>
            <Button type="submit" disabled={loading} variant="outline">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kuriama...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Sukurti juodraštį
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
