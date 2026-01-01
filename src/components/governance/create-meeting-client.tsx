"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { createMeeting } from "@/app/actions/governance"
import { useToast } from "@/components/ui/use-toast"
import { addDays } from "date-fns"
import { format } from "date-fns"
import { ERROR_CODE } from "@/app/domain/constants"

/**
 * Maps DomainError to user-friendly Lithuanian messages.
 * Treats operation_failed as an expected domain outcome, not a crash.
 * 
 * Note: When DomainError is thrown from server actions, Next.js serializes it.
 * DomainError constructor sets error.message to the code string, so we check message === ERROR_CODE.
 */
function mapGovernanceError(error: unknown): string {
  // DomainError thrown from server actions will have message matching ERROR_CODE
  if (error instanceof Error) {
    const errorMessage = error.message
    // Check for operation_failed error code (DomainError sets message to code string)
    if (errorMessage === ERROR_CODE.OPERATION_FAILED) {
      return "Sprendimai priimami fiziniame susirinkime ir fiksuojami protokole. Įkelkite protokolą po susirinkimo."
    }
  }
  // Fallback for unknown errors
  return error instanceof Error ? error.message : "Įvyko nenumatyta klaida"
}

interface Ruleset {
  quorum_percentage: number
  notice_period_days: number
  annual_fee: number
}

interface CreateMeetingClientProps {
  ruleset: Ruleset | null
  membershipId: string
  orgSlug: string
}

export function CreateMeetingClient({
  ruleset,
  membershipId,
  orgSlug,
}: CreateMeetingClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate minimum date based on notice period
  const minDate = ruleset
    ? format(addDays(new Date(), ruleset.notice_period_days), "yyyy-MM-dd'T'HH:mm")
    : format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm") // Default to 7 days if no ruleset

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome įvesti susirinkimo pavadinimą",
        variant: "destructive" as any,
      })
      return
    }

    if (!scheduledAt) {
      toast({
        title: "Klaida",
        description: "Prašome pasirinkti susirinkimo datą",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createMeeting(membershipId, title.trim(), scheduledAt)
      toast({
        title: "Sėkmė",
        description: "Susirinkimas sukurtas sėkmingai",
      })
      router.push(`/dashboard/${orgSlug}/governance`)
      router.refresh()
    } catch (error) {
      // Map DomainError to user-friendly message (no stack traces, no raw error codes)
      const userMessage = mapGovernanceError(error)
      toast({
        title: "Klaida",
        description: userMessage,
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
        onClick={() => router.back()}
        className="mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Grįžti
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Šaukti Susirinkimą</CardTitle>
          <CardDescription>
            Sukurkite naują bendruomenės susirinkimą
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Pavadinimas <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Susirinkimo pavadinimas"
                required
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div>
              <label htmlFor="scheduledAt" className="block text-sm font-medium mb-2">
                Data ir Laikas <span className="text-destructive">*</span>
              </label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={minDate}
                required
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {ruleset && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Minimalus terminas: {ruleset.notice_period_days} dienos nuo šiandien
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pagal aktyvią konstituciją, susirinkimas turi būti paskelbtas mažiausiai {ruleset.notice_period_days} dienų iš anksto.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isSubmitting ? "Kuriama..." : "Sukurti Susirinkimą"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
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

