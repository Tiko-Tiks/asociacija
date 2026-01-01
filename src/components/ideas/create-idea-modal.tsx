'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { createIdea } from '@/app/actions/ideas'
import { useToast } from '@/components/ui/use-toast'

interface CreateIdeaModalProps {
  orgId: string
  onClose: () => void
}

export function CreateIdeaModal({ orgId, onClose }: CreateIdeaModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    details: '',
    public_visible: true,
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

    setLoading(true)

    try {
      const result = await createIdea(
        orgId,
        formData.title,
        formData.summary || null,
        formData.details || null,
        formData.public_visible
      )

      if (result.ok) {
        toast({
          title: 'Sėkmė',
          description: 'Idėja sėkmingai sukurta',
        })
        onClose()
      } else {
        toast({
          title: 'Klaida',
          description: result.reason === 'NOT_A_MEMBER' ? 'Neturite teisių' : 'Nepavyko sukurti idėjos',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error creating idea:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sukurti idėją</DialogTitle>
          <DialogDescription>
            Pateikite idėją, kurią galės balsuoti bendruomenės nariai
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Pavadinimas <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Idėjos pavadinimas"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Trumpas aprašymas</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Trumpas aprašymas (rodomas sąraše)"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Išsamus aprašymas</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              placeholder="Išsamus aprašymas (rodomas detaliame puslapyje)"
              rows={6}
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="public_visible"
              checked={formData.public_visible}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, public_visible: checked === true })
              }
              disabled={loading}
            />
            <Label htmlFor="public_visible" className="cursor-pointer">
              Rodyti viešame puslapyje
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Atšaukti
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kuriama...
                </>
              ) : (
                'Sukurti'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

