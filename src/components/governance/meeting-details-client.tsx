"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Users, Upload, FileText } from "lucide-react"
import { markAttendance, createProtocol } from "@/app/actions/governance"
import { useToast } from "@/components/ui/use-toast"
import { formatDateLT } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
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

interface AttendanceItem {
  membership_id: string
  member_name: string | null
  present: boolean
}

interface Protocol {
  id: string
  url: string
  created_at: string
}

interface Meeting {
  id: string
  title: string
  scheduled_at: string
  quorum_met: boolean | null
  attendance: AttendanceItem[]
  protocols: Protocol[]
}

interface MeetingDetailsClientProps {
  meeting: Meeting
  membershipId: string
  userRole: 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'
}

export function MeetingDetailsClient({
  meeting: initialMeeting,
  membershipId,
  userRole,
}: MeetingDetailsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isOwner = userRole === 'OWNER'
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    Object.fromEntries(
      initialMeeting.attendance.map((a) => [a.membership_id, a.present])
    )
  )
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({})
  const [isUploadingProtocol, setIsUploadingProtocol] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAttendanceChange = async (
    targetMembershipId: string,
    present: boolean
  ) => {
    // Optimistic update
    setAttendance((prev) => ({
      ...prev,
      [targetMembershipId]: present,
    }))
    setIsUpdating((prev) => ({ ...prev, [targetMembershipId]: true }))

    try {
      await markAttendance(
        membershipId,
        initialMeeting.id,
        targetMembershipId,
        present
      )
      // Refresh page to get updated quorum status from DB
      router.refresh()
    } catch (error) {
      // Revert optimistic update
      setAttendance((prev) => ({
        ...prev,
        [targetMembershipId]: !present,
      }))
      // Map DomainError to user-friendly message (no stack traces, no raw error codes)
      const userMessage = mapGovernanceError(error)
      toast({
        title: "Klaida",
        description: userMessage,
        variant: "destructive" as any,
      })
    } finally {
      setIsUpdating((prev) => {
        const next = { ...prev }
        delete next[targetMembershipId]
        return next
      })
    }
  }

  const handleProtocolUpload = async (file: File) => {
    setIsUploadingProtocol(true)
    try {
      const supabase = createClient()
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `meetings/${initialMeeting.id}/protocols/${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage (using evidence bucket, same as projects)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        throw new Error('Nepavyko gauti failo nuorodos')
      }

      // Create protocol record in database
      await createProtocol(membershipId, initialMeeting.id, urlData.publicUrl)

      toast({
        title: "Sėkmė",
        description: "Protokolas įkeltas sėkmingai",
      })

      router.refresh()
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko įkelti protokolo",
        variant: "destructive" as any,
      })
    } finally {
      setIsUploadingProtocol(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Grįžti
      </Button>

      {/* Meeting Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{initialMeeting.title}</CardTitle>
              <CardDescription className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(initialMeeting.scheduled_at), 'yyyy-MM-dd HH:mm', { locale: lt })}
              </CardDescription>
            </div>
            {/* Quorum status hidden in pilot - protocol is source of truth */}
            {initialMeeting.protocols.length > 0 && (
              <Badge
                variant="success"
                className="text-base px-4 py-2"
              >
                Sprendimai priimti
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lankomumas
          </CardTitle>
          <CardDescription>
            Pažymėkite narius, kurie dalyvavo susirinkime (fizinis dalyvavimas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {initialMeeting.attendance.map((item) => (
              <div
                key={item.membership_id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <Checkbox
                  id={`attendance-${item.membership_id}`}
                  checked={attendance[item.membership_id] || false}
                  onCheckedChange={(checked) => {
                    handleAttendanceChange(
                      item.membership_id,
                      checked === true
                    )
                  }}
                  disabled={!!isUpdating[item.membership_id]}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <label
                  htmlFor={`attendance-${item.membership_id}`}
                  className="flex-1 cursor-pointer font-medium"
                >
                  {item.member_name || "N/A"}
                </label>
                {isUpdating[item.membership_id] && (
                  <span className="text-sm text-muted-foreground">
                    Atnaujinama...
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Protocols Section - Upload only for OWNER */}
      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Protokolai
                </CardTitle>
                <CardDescription>
                  Protokolas yra sprendimų šaltinis. Įkelkite protokolą po susirinkimo, kad fiksuotumėte priimtus sprendimus.
                </CardDescription>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleProtocolUpload(file)
                    }
                  }}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingProtocol}
                  variant="outline"
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploadingProtocol ? 'Įkeliama...' : 'Įkelti Protokolą'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {initialMeeting.protocols.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Protokolų nėra. Įkelkite protokolą naudodami mygtuką aukščiau.
              </p>
            ) : (
              <div className="space-y-2">
                {initialMeeting.protocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Protokolas
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateLT(protocol.created_at, 'datetime')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(protocol.url, '_blank')}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Atidaryti
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Protocols Section - Read-only view for MEMBER (only if protocols exist) */}
      {!isOwner && initialMeeting.protocols.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Protokolai
            </CardTitle>
            <CardDescription>
              Protokolas yra sprendimų šaltinis. Čia matote susirinkimo protokolus su priimtais sprendimais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {initialMeeting.protocols.map((protocol) => (
                <div
                  key={protocol.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Protokolas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateLT(protocol.created_at, 'datetime')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(protocol.url, '_blank')}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Atidaryti
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

