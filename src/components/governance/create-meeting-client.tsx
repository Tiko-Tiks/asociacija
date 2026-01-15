"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, AlertTriangle, Building2 } from "lucide-react"
import { createMeeting } from "@/app/actions/governance"
import { MEETING_TYPE_CONFIG, type MeetingType } from "@/app/domain/meeting-types"
import { useToast } from "@/components/ui/use-toast"
import { addDays, format } from "date-fns"
import { ERROR_CODE } from "@/app/domain/constants"
import { TimePicker } from "@/components/ui/time-picker"
import { DatePickerLT } from "@/components/ui/date-picker-lt"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Maps DomainError to user-friendly Lithuanian messages.
 * Treats operation_failed as an expected domain outcome, not a crash.
 *
 * Note: When DomainError is thrown from server actions, Next.js serializes it.
 * DomainError constructor sets error.message to the code string, so we check message === ERROR_CODE.
 */
function mapGovernanceError(error: unknown): string {
  if (error instanceof Error) {
    const errorMessage = error.message
    if (errorMessage === ERROR_CODE.OPERATION_FAILED) {
      return "Sprendimai priimami fiziniame susirinkime ir fiksuojami protokole. Įkelkite protokolą po susirinkimo."
    }
  }
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
  const [meetingType, setMeetingType] = useState<MeetingType>('GA')
  const [title, setTitle] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get default title based on meeting type
  const getDefaultTitle = (type: MeetingType): string => {
    const config = MEETING_TYPE_CONFIG[type]
    const year = new Date().getFullYear()
    return `${config.label} ${year}`
  }
  
  // Get icon for meeting type
  const getMeetingTypeIcon = (type: MeetingType) => {
    switch (type) {
      case 'GA': return <Users className="h-4 w-4" />
      case 'GA_EXTRAORDINARY': return <AlertTriangle className="h-4 w-4" />
      case 'BOARD': return <Building2 className="h-4 w-4" />
    }
  }
  
  // Update title when meeting type changes
  const handleMeetingTypeChange = (type: MeetingType) => {
    setMeetingType(type)
    // Only update title if it's empty or matches previous default
    if (!title || Object.values(MEETING_TYPE_CONFIG).some(c => title.startsWith(c.label))) {
      setTitle(getDefaultTitle(type))
    }
  }

  const minDateTime = useMemo(() => {
    // If notice_period_days is 0, null, or undefined - allow same day
    // Only apply delay if explicitly set to a positive number
    const noticeDays = (ruleset?.notice_period_days !== null && ruleset?.notice_period_days !== undefined && ruleset.notice_period_days > 0)
      ? ruleset.notice_period_days 
      : 0
    return addDays(new Date(), noticeDays)
  }, [ruleset])

  const minDate = format(minDateTime, "yyyy-MM-dd")
  const minTimeForMinDate = format(minDateTime, "HH:mm")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Klaida",
        description: "Prašome pasirinkti susirinkimo datą ir laiką",
        variant: "destructive" as any,
      })
      return
    }

    if (scheduledDate === minDate && scheduledTime < minTimeForMinDate) {
      toast({
        title: "Klaida",
        description: "Pasirinktas laikas per ankstyvas pagal minimalią skelbimo datą",
        variant: "destructive" as any,
      })
      return
    }

    const scheduledAt = `${scheduledDate}T${scheduledTime}`
    
    // Use provided title or auto-generate from meeting type
    const finalTitle = title.trim() || getDefaultTitle(meetingType)

    setIsSubmitting(true)
    try {
      const result = await createMeeting(membershipId, finalTitle, scheduledAt, meetingType)
      toast({
        title: "Susirinkimas sukurtas",
        description: "Dabar galite sudaryti darbotvarkę",
      })
      // Redirect to meeting detail page to continue with agenda creation
      router.push(`/dashboard/${orgSlug}/governance/${result.id}`)
      router.refresh()
    } catch (error) {
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
          <CardTitle>Šaukti susirinkimą</CardTitle>
          <CardDescription>
            Sukurkite naują bendruomenės susirinkimą
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Susirinkimo tipas */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Susirinkimo tipas <span className="text-destructive">*</span>
              </label>
              <Select
                value={meetingType}
                onValueChange={(value) => handleMeetingTypeChange(value as MeetingType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pasirinkite susirinkimo tipą" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEETING_TYPE_CONFIG) as MeetingType[]).map((type) => {
                    const config = MEETING_TYPE_CONFIG[type]
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {getMeetingTypeIcon(type)}
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {/* Tipo aprašymas */}
              <p className="mt-2 text-sm text-muted-foreground">
                {MEETING_TYPE_CONFIG[meetingType].description}
              </p>
            </div>

            {/* Pavadinimas (neprivalomas) */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-2">
                Pavadinimas <span className="text-xs text-muted-foreground">(neprivalomas)</span>
              </label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={getDefaultTitle(meetingType)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Jei neįvesite, bus naudojamas: {getDefaultTitle(meetingType)}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-medium mb-2">
                  Data <span className="text-destructive">*</span>
                </label>
                <DatePickerLT
                  id="scheduledDate"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                  min={minDate}
                  required
                  placeholder="Pasirinkite datą"
                />
              </div>
              <div>
                <label htmlFor="scheduledTime" className="block text-sm font-medium mb-2">
                  Laikas <span className="text-destructive">*</span>
                </label>
                <TimePicker
                  id="scheduledTime"
                  value={scheduledTime}
                  onChange={setScheduledTime}
                  min={scheduledDate === minDate ? minTimeForMinDate : undefined}
                  required
                />
              </div>
            </div>

            {ruleset && ruleset.notice_period_days !== null && ruleset.notice_period_days > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  Minimalus terminas: {ruleset.notice_period_days} dienos nuo šiandien
                </p>
                <p className="text-xs text-muted-foreground">
                  Pagal aktyvią konstituciją, susirinkimas turi būti paskelbtas mažiausiai {ruleset.notice_period_days} dienų iš anksto.
                </p>
              </div>
            )}
            {(!ruleset || ruleset.notice_period_days === null || ruleset.notice_period_days === 0) && (
              <p className="mt-2 text-sm text-muted-foreground">
                Galite pasirinkti bet kurią datą (nenustatytas minimalus terminas).
              </p>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isSubmitting ? "Kuriama..." : "Tęsti → Darbotvarkė"}
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
