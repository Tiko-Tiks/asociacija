/**
 * LEGACY (v17–v18): This component is read-only.
 * Projects v19.0+ are derived from APPROVED resolutions.
 */
"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, Image as ImageIcon } from "lucide-react"
import { updateProjectStatus, createMediaItem } from "@/app/actions/projects"
import { useToast } from "@/components/ui/use-toast"
import { PROJECT_STATUS, MEDIA_CATEGORY } from "@/app/domain/constants"
import { ProjectStatus, MediaCategory } from "@/app/domain/types"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

interface MediaItem {
  id: string
  url: string
  category: string
  created_at: string
}

interface Project {
  id: string
  title: string // Schema v15.1: projects.title (not projects.name)
  status: ProjectStatus
  budget: number | null
  description: string | null
  media_items: MediaItem[]
}

interface ProjectDetailsClientProps {
  project: Project
  membershipId: string
  userRole: 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'
}

export function ProjectDetailsClient({
  project: initialProject,
  membershipId,
  userRole,
}: ProjectDetailsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isOwner = userRole === 'OWNER'
  const [project, setProject] = useState(initialProject)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isUploading, setIsUploading] = useState<string | null>(null)
  const fileInputRefBefore = useRef<HTMLInputElement>(null)
  const fileInputRefAfter = useRef<HTMLInputElement>(null)

  // MEDIA UPLOAD DESIGN (Schema v15.1 aligned):
  // - Allowed categories: BEFORE, AFTER (for projects)
  // - Use-case: BEFORE = photos before work, AFTER = photos after completion
  // - Minimal insert: object_id, object_type, category only
  // 
  // Enable when ready for testing:
  const MEDIA_UPLOAD_ENABLED = false

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    // Client-side validation: Check if trying to close without AFTER photos
    if (newStatus === PROJECT_STATUS.CLOSED) {
      const hasAfterPhotos = project.media_items.some(
        (item) => item.category === MEDIA_CATEGORY.AFTER
      )
      if (!hasAfterPhotos) {
        toast({
          title: "Klaida",
          description: "Projektas negali būti uždarytas be 'Po' nuotraukų. Pridėkite nuotraukas ir bandykite dar kartą.",
          variant: "destructive" as any,
        })
        return
      }
    }

    setIsUpdatingStatus(true)
    try {
      // membership_id is optional - pass empty string for compatibility (server action ignores it)
      await updateProjectStatus(membershipId || '', project.id, newStatus)
      setProject((prev) => ({ ...prev, status: newStatus }))
      toast({
        title: "Sėkmė",
        description: "Projekto statusas pakeistas",
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko pakeisti statuso",
        variant: "destructive" as any,
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleFileUpload = async (
    file: File,
    category: MediaCategory
  ) => {
    setIsUploading(category)
    try {
      const supabase = createClient()
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${project.id}/${category}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`)
      }

      if (!uploadData?.path) {
        throw new Error('Upload succeeded but no path returned')
      }

      // Get public URL - getPublicUrl returns { data: { publicUrl: string } }
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(uploadData.path)

      const publicUrl = urlData?.publicUrl
      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file')
      }

      // Create media item record in database
      // membership_id is optional - pass empty string for compatibility (server action ignores it)
      const result = await createMediaItem(membershipId || '', project.id, publicUrl, category)
      
      if (!result?.success) {
        throw new Error('Failed to create media item record')
      }

      toast({
        title: "Sėkmė",
        description: "Nuotrauka įkelta sėkmingai",
      })

      // Refresh the page to show the new image
      router.refresh()
    } catch (error) {
      console.error('File upload error:', error)
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko įkelti nuotraukos",
        variant: "destructive" as any,
      })
    } finally {
      setIsUploading(null)
    }
  }

  // Description feature temporarily disabled - schema does not support it cleanly

  const getStatusBadgeVariant = (status: ProjectStatus): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (status) {
      case PROJECT_STATUS.ACTIVE:
        return 'success'
      case PROJECT_STATUS.CLOSED:
        return 'default'
      case PROJECT_STATUS.APPROVED:
        return 'default'
      case PROJECT_STATUS.IDEA:
        return 'secondary'
      case PROJECT_STATUS.ARCHIVED:
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const statusSteps: ProjectStatus[] = [
    PROJECT_STATUS.IDEA,
    PROJECT_STATUS.APPROVED,
    PROJECT_STATUS.ACTIVE,
    PROJECT_STATUS.CLOSED,
  ]

  const currentStatusIndex = statusSteps.indexOf(project.status)

  const beforeMedia = project.media_items.filter(
    (item) => item.category === MEDIA_CATEGORY.BEFORE
  )
  const afterMedia = project.media_items.filter(
    (item) => item.category === MEDIA_CATEGORY.AFTER
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Grįžti
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{project.title}</CardTitle>
            </div>
            <Badge variant={getStatusBadgeVariant(project.status)} className="text-base px-4 py-2">
              {project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Project Description - Read-only MVP
                Note: No schema changes, no media_category usage
                Display description if available, otherwise show placeholder
            */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Aprašymas</p>
              {project.description ? (
                <div className="text-base text-foreground bg-muted/30 rounded-md p-3 border border-border">
                  <p className="whitespace-pre-wrap">{project.description}</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic bg-muted/30 rounded-md p-3 border border-border">
                  Aprašymas nepridėtas
                </div>
              )}
            </div>
            
            {project.budget !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Biudžetas</p>
                <p className="text-xl font-semibold">{project.budget.toFixed(2)} €</p>
              </div>
            )}

            {/* Status Progress - Only editable for OWNER */}
            {isOwner ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Statusas</p>
                <div className="flex gap-2 flex-wrap">
                  {statusSteps.map((status, index) => (
                    <Button
                      key={status}
                      variant={index <= currentStatusIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      disabled={isUpdatingStatus || index === currentStatusIndex}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Statusas</p>
                <Badge variant={getStatusBadgeVariant(project.status)} className="text-base px-4 py-2">
                  {project.status}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evidence Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BEFORE Section */}
        <Card>
          <CardHeader>
            <CardTitle>Prieš</CardTitle>
            <CardDescription>
              Nuotraukos prieš projekto įgyvendinimą
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload button - only for OWNER */}
              {/* TEMPORARILY DISABLED: Media upload UI
                  Reason: Schema may not support media uploads fully, preventing pilot testing
                  TODO: Re-enable when schema support is confirmed
                  Set MEDIA_UPLOAD_ENABLED = true to re-enable
              */}
              {isOwner && MEDIA_UPLOAD_ENABLED && (
                <>
                  <input
                    ref={fileInputRefBefore}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file, MEDIA_CATEGORY.BEFORE)
                      }
                    }}
                    className="hidden"
                    aria-label="Įkelti Prieš nuotrauką"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRefBefore.current?.click()}
                    disabled={isUploading === MEDIA_CATEGORY.BEFORE}
                    className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading === MEDIA_CATEGORY.BEFORE ? "Įkeliama..." : "Įkelti Nuotrauką"}
                  </Button>
                </>
              )}
              
              {!MEDIA_UPLOAD_ENABLED && isOwner && (
                <div className="text-sm text-muted-foreground italic text-center py-2">
                  Įkėlimas: Bus pridėta vėliau
                </div>
              )}

              {beforeMedia.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nuotraukų nėra</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {beforeMedia.map((item) => (
                    <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={item.url}
                        alt="Prieš"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AFTER Section */}
        <Card>
          <CardHeader>
            <CardTitle>Po</CardTitle>
            <CardDescription>
              Nuotraukos po projekto įgyvendinimo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Upload button - only for OWNER */}
              {/* TEMPORARILY DISABLED: Media upload UI
                  Reason: Schema may not support media uploads fully, preventing pilot testing
                  TODO: Re-enable when schema support is confirmed
                  Set MEDIA_UPLOAD_ENABLED = true to re-enable
              */}
              {isOwner && MEDIA_UPLOAD_ENABLED && (
                <>
                  <input
                    ref={fileInputRefAfter}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file, MEDIA_CATEGORY.AFTER)
                      }
                    }}
                    className="hidden"
                    aria-label="Įkelti Po nuotrauką"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRefAfter.current?.click()}
                    disabled={isUploading === MEDIA_CATEGORY.AFTER}
                    className="w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading === MEDIA_CATEGORY.AFTER ? "Įkeliama..." : "Įkelti Nuotrauką"}
                  </Button>
                </>
              )}
              
              {!MEDIA_UPLOAD_ENABLED && isOwner && (
                <div className="text-sm text-muted-foreground italic text-center py-2">
                  Įkėlimas: Bus pridėta vėliau
                </div>
              )}

              {afterMedia.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nuotraukų nėra</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reikalinga norint uždaryti projektą
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {afterMedia.map((item) => (
                    <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={item.url}
                        alt="Po"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

