"use client"

import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'
import { updateMemberProfile } from '@/app/actions/update-member-profile'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface EditMemberNameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  userId: string
  currentFullName: string | null
  currentFirstName: string | null
  currentLastName: string | null
}

export function EditMemberNameModal({
  open,
  onOpenChange,
  orgId,
  userId,
  currentFullName,
  currentFirstName,
  currentLastName,
}: EditMemberNameModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
  })

  // Initialize form data when modal opens
  useEffect(() => {
    if (open) {
      // Try to parse full_name if first_name/last_name not available
      let firstName = currentFirstName || ''
      let lastName = currentLastName || ''
      
      if (!firstName && !lastName && currentFullName) {
        const parts = currentFullName.trim().split(' ')
        if (parts.length >= 2) {
          firstName = parts[0]
          lastName = parts.slice(1).join(' ')
        } else if (parts.length === 1) {
          firstName = parts[0]
        }
      }
      
      setFormData({
        first_name: firstName,
        last_name: lastName,
      })
    }
  }, [open, currentFullName, currentFirstName, currentLastName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: 'Klaida',
        description: 'Vardas ir pavardė yra privalomi',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await updateMemberProfile(
        orgId,
        userId,
        formData.first_name.trim(),
        formData.last_name.trim()
      )

      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Nario vardas ir pavardė atnaujinti',
        })
        onOpenChange(false)
        router.refresh()
        // Force full page reload to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atnaujinti nario duomenų',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating member name:', error)
      toast({
        title: 'Klaida',
        description: error instanceof Error ? error.message : 'Įvyko klaida',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redaguoti nario vardą</DialogTitle>
          <DialogDescription>
            Atnaujinkite nario vardą ir pavardę
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-first-name">Vardas *</Label>
            <Input
              id="edit-first-name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Vardas"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-last-name">Pavardė *</Label>
            <Input
              id="edit-last-name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Pavardė"
              required
              disabled={isSubmitting}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Atšaukti
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Išsaugoti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

