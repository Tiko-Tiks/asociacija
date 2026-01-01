"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createEvent, aiAssistEvent } from '@/app/actions/events'
import { createResolutionDraft, aiAssistResolution, ResolutionVisibility } from '@/app/actions/resolutions'
import { RESOLUTION_VISIBILITY } from '@/app/domain/constants'
import { Sparkles } from 'lucide-react'

interface EventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
}

interface ResolutionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
}

interface EventFormData {
  title: string
  start_time: string
  location: string
  description: string
}

interface ResolutionFormData {
  title: string
  content: string
  visibility: ResolutionVisibility
}

export function EventModal({ open, onOpenChange, orgId }: EventModalProps) {
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<EventFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiAssisting, setIsAiAssisting] = useState(false)
  const { toast } = useToast()

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true)
    try {
      const result = await createEvent(
        orgId,
        data.title,
        data.start_time,
        data.location || undefined,
        data.description || undefined
      )

      if (result.success) {
        toast({
          title: 'Renginys sukurtas',
          description: 'Renginys sėkmingai pridėtas į veiklos srautą.',
        })
        reset()
        onOpenChange(false)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti renginio',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAiAssist = async () => {
    setIsAiAssisting(true)
    try {
      const template = await aiAssistEvent(orgId)
      setValue('title', template.title)
      setValue('description', template.description)
      toast({
        title: 'AI pagalba',
        description: 'Šablonas užpildytas',
      })
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Nepavyko gauti AI pagalbos',
        variant: 'destructive',
      })
    } finally {
      setIsAiAssisting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Kurti renginį</DialogTitle>
          <DialogDescription>
            Pridėkite naują renginį į bendruomenės veiklos srautą
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Pavadinimas *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAiAssist}
                disabled={isAiAssisting}
                className="h-7 text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AI: Parašyk už mane
              </Button>
            </div>
            <Input
              id="title"
              {...register('title', { required: 'Pavadinimas yra privalomas' })}
              placeholder="Pvz: Bendruomenės susitikimas"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Pradžios laikas *</Label>
            <Input
              id="start_time"
              type="datetime-local"
              {...register('start_time', { required: 'Pradžios laikas yra privalomas' })}
            />
            {errors.start_time && (
              <p className="text-sm text-red-600">{errors.start_time.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Vieta</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="Pvz: Bendruomenės centras"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Aprašymas</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Papildoma informacija apie renginį"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
            >
              Atšaukti
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Kuriama...' : 'Sukurti'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResolutionModal({ open, onOpenChange, orgId }: ResolutionModalProps) {
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ResolutionFormData>({
    defaultValues: {
      visibility: RESOLUTION_VISIBILITY.MEMBERS,
    },
  })
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false)
  const [isSubmittingProposed, setIsSubmittingProposed] = useState(false)
  const [isAiAssisting, setIsAiAssisting] = useState(false)
  const { toast } = useToast()

  const visibility = watch('visibility')

  const handleSave = async (status: 'DRAFT' | 'PROPOSED') => {
    const isDraft = status === 'DRAFT'
    if (isDraft) {
      setIsSubmittingDraft(true)
    } else {
      setIsSubmittingProposed(true)
    }

    try {
      const data = watch()
      if (!data.title?.trim() || !data.content?.trim()) {
        toast({
          title: 'Klaida',
          description: 'Pavadinimas ir turinys yra privalomi',
          variant: 'destructive',
        })
        if (isDraft) {
          setIsSubmittingDraft(false)
        } else {
          setIsSubmittingProposed(false)
        }
        return
      }

      const result = await createResolutionDraft(
        orgId,
        data.title,
        data.content,
        data.visibility,
        status
      )

      if (result.success) {
        toast({
          title: isDraft ? 'Juodraštis išsaugotas' : 'Nutarimas pateiktas',
          description: isDraft
            ? 'Nutarimas išsaugotas kaip juodraštis'
            : 'Nutarimas pateiktas patvirtinimui',
        })
        reset()
        onOpenChange(false)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko sukurti nutarimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      if (isDraft) {
        setIsSubmittingDraft(false)
      } else {
        setIsSubmittingProposed(false)
      }
    }
  }

  const handleAiAssist = async () => {
    setIsAiAssisting(true)
    try {
      const template = await aiAssistResolution(orgId)
      setValue('title', template.title)
      setValue('content', template.content)
      toast({
        title: 'AI pagalba',
        description: 'Šablonas užpildytas',
      })
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Nepavyko gauti AI pagalbos',
        variant: 'destructive',
      })
    } finally {
      setIsAiAssisting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Kurti nutarimą</DialogTitle>
          <DialogDescription>
            Sukurkite naują nutarimą kaip juodraštį arba pateikite patvirtinimui
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Pavadinimas *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAiAssist}
                disabled={isAiAssisting}
                className="h-7 text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AI: Parašyk už mane
              </Button>
            </div>
            <Input
              id="title"
              {...register('title', { required: 'Pavadinimas yra privalomas' })}
              placeholder="Nutarimo pavadinimas"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Turinys *</Label>
            <Textarea
              id="content"
              {...register('content', { required: 'Turinys yra privalomas' })}
              placeholder="Nutarimo turinys"
              rows={6}
            />
            {errors.content && (
              <p className="text-sm text-red-600">{errors.content.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Matomumas</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setValue('visibility', value as ResolutionVisibility)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RESOLUTION_VISIBILITY.PUBLIC}>Viešas</SelectItem>
                <SelectItem value={RESOLUTION_VISIBILITY.MEMBERS}>Nariams</SelectItem>
                <SelectItem value={RESOLUTION_VISIBILITY.INTERNAL}>Vidaus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
            >
              Atšaukti
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSave('DRAFT')}
              disabled={isSubmittingDraft || isSubmittingProposed}
            >
              {isSubmittingDraft ? 'Išsaugoma...' : 'Išsaugoti kaip juodraštį'}
            </Button>
            <Button
              type="button"
              onClick={() => handleSave('PROPOSED')}
              disabled={isSubmittingDraft || isSubmittingProposed}
            >
              {isSubmittingProposed ? 'Pateikiama...' : 'Pateikti patvirtinimui'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

