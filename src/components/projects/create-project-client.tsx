"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { createProject } from "@/app/actions/projects"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

interface CreateProjectClientProps {
  membershipId: string
}

function CreateProjectForm({ membershipId }: CreateProjectClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [budget, setBudget] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Extract slug from current path (e.g., /dashboard/[slug]/projects/new)
  const slugMatch = pathname.match(/\/dashboard\/([^\/]+)/)
  const orgSlug = slugMatch ? slugMatch[1] : null
  
  // Get orgId from URL to preserve it in redirects (fallback)
  const orgId = searchParams.get('orgId')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome įvesti projekto pavadinimą",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const budgetNum = budget ? parseFloat(budget) : undefined
      const result = await createProject(
        membershipId,
        name.trim(),
        description.trim() || undefined,
        budgetNum
      )
      
      if (result.success && result.data) {
        toast({
          title: "Sėkmė",
          description: "Projektas sukurtas sėkmingai",
        })
        // Use slug-based routing if orgSlug is available
        // Otherwise fall back to legacy format (will redirect)
        const redirectUrl = orgSlug
          ? `/dashboard/${orgSlug}/projects/${result.data.id}`
          : orgId 
            ? `/dashboard/projects/${result.data.id}?orgId=${orgId}`
            : `/dashboard/projects/${result.data.id}`
        router.push(redirectUrl)
        router.refresh()
      } else {
        toast({
          title: "Klaida",
          description: result.error || "Nepavyko sukurti projekto",
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko sukurti projekto",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => {
          const backUrl = orgId ? `/dashboard/projects?orgId=${orgId}` : '/dashboard/projects'
          router.push(backUrl)
        }}
        className="mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Grįžti
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Naujas Projektas</CardTitle>
          <CardDescription>
            Sukurkite naują bendruomenės projektą
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Pavadinimas <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Projekto pavadinimas"
                required
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Aprašymas
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Projekto aprašymas"
                rows={4}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="budget" className="block text-sm font-medium mb-2">
                Biudžetas (€)
              </label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isSubmitting ? "Kuriama..." : "Sukurti Projektą"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const backUrl = orgId ? `/dashboard/projects?orgId=${orgId}` : '/dashboard/projects'
                  router.push(backUrl)
                }}
                disabled={isSubmitting}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Atšaukti
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function CreateProjectClient({ membershipId }: CreateProjectClientProps) {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CreateProjectForm membershipId={membershipId} />
    </Suspense>
  )
}

