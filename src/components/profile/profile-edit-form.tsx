"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProfile } from '@/app/actions/update-profile'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ProfileEditFormProps {
  initialData: {
    first_name: string | null
    last_name: string | null
    full_name: string | null
  }
  orgSlug: string
}

export function ProfileEditForm({ initialData, orgSlug }: ProfileEditFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: initialData.first_name || '',
    last_name: initialData.last_name || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await updateProfile(formData.first_name, formData.last_name)

      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Profilis sėkmingai atnaujintas",
        })
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko atnaujinti profilio",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko atnaujinti profilio",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redaguoti profilį</CardTitle>
        <CardDescription>
          Atnaujinkite savo vardą ir pavardę
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">Vardas *</Label>
            <Input
              id="first_name"
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="Jūsų vardas"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Pavardė *</Label>
            <Input
              id="last_name"
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Jūsų pavardė"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Išsaugoti
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/${orgSlug}`)}
              disabled={isSubmitting}
            >
              Atšaukti
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

