"use client"

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
import { createResolution, ResolutionVisibility } from '@/app/actions/resolutions'
import { RESOLUTION_VISIBILITY } from '@/app/domain/constants'
import { useRouter } from 'next/navigation'

interface CreateResolutionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
}

export function CreateResolutionModal({
  open,
  onOpenChange,
  orgId,
}: CreateResolutionModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<ResolutionVisibility>(RESOLUTION_VISIBILITY.MEMBERS)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingForApproval, setIsSubmittingForApproval] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSaveDraft = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome užpildyti visus privalomus laukus",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createResolution(orgId, title.trim(), content.trim(), visibility, 'DRAFT')

      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Sprendimas išsaugotas kaip juodraštis",
        })
        onOpenChange(false)
        resetForm()
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko sukurti sprendimo",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko sukurti sprendimo",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitForApproval = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome užpildyti visus privalomus laukus",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmittingForApproval(true)
    try {
      const result = await createResolution(orgId, title.trim(), content.trim(), visibility, 'PROPOSED')

      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Sprendimas pateiktas patvirtinimui",
        })
        onOpenChange(false)
        resetForm()
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko pateikti sprendimo",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko pateikti sprendimo",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmittingForApproval(false)
    }
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setVisibility(RESOLUTION_VISIBILITY.MEMBERS)
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sukurti sprendimą</DialogTitle>
          <DialogDescription>
            Sukurkite naują valdymo sprendimą
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Pavadinimas <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Įveskite sprendimo pavadinimą..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Turinys <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Aprašykite sprendimo turinį..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">
              Matomumas <span className="text-destructive">*</span>
            </Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as ResolutionVisibility)}
            >
              <SelectTrigger id="visibility" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <SelectValue placeholder="Pasirinkite matomumą" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RESOLUTION_VISIBILITY.PUBLIC}>Viešas</SelectItem>
                <SelectItem value={RESOLUTION_VISIBILITY.MEMBERS}>Nariams</SelectItem>
                <SelectItem value={RESOLUTION_VISIBILITY.INTERNAL}>Vidaus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting || isSubmittingForApproval}
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Atšaukti
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting || isSubmittingForApproval || !title.trim() || !content.trim()}
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmitting ? 'Išsaugoma...' : 'Išsaugoti kaip juodraštį'}
          </Button>
          <Button
            type="button"
            onClick={handleSubmitForApproval}
            disabled={isSubmitting || isSubmittingForApproval || !title.trim() || !content.trim()}
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isSubmittingForApproval ? 'Pateikiama...' : 'Pateikti patvirtinimui'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

