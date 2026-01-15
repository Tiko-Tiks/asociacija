/**
 * LEGACY (v17–v18): This component is read-only.
 * Projects v19.0+ are derived from APPROVED resolutions.
 */
"use client"

import { useState, startTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, FolderKanban, MoreVertical, Eye } from "lucide-react"
import { PROJECT_STATUS } from "@/app/domain/constants"
import { ProjectStatus } from "@/app/domain/types"
import Image from "next/image"
import { createProject, type Project } from "@/app/actions/projects"
import { useToast } from "@/components/ui/use-toast"

interface ProjectsListClientProps {
  projects: Project[]
  membershipId: string
  orgId: string
  orgSlug: string
  userRole: 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'
  pilotMode?: boolean
}

export function ProjectsListClient({
  projects,
  membershipId,
  orgId,
  orgSlug,
  userRole,
  pilotMode = false,
}: ProjectsListClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Only OWNER role may see Create Project UI - MEMBER, ADMIN, CHAIR are hidden
  const isOwner = userRole === 'OWNER'

  // Server component is the ONLY data source - use props.projects directly
  // NO local state for projects - render only from props
  // Defensive check: ensure projects is always an array
  const projectsFromServer = Array.isArray(projects) ? projects : []

  const handleCreateProject = async () => {
    if (!projectTitle.trim()) {
      toast({
        title: "Klaida",
        description: "Prašome įvesti projekto pavadinimą",
        variant: "destructive" as any,
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createProject(membershipId, projectTitle.trim())
      
      if (result.success) {
        toast({
          title: "Sėkmė",
          description: "Projektas sukurtas sėkmingai",
        })
        setIsSheetOpen(false)
        setProjectTitle('')
        // Refresh the page to show the new project in the list
        startTransition(() => {
          router.refresh()
        })
      } else {
        // Map server error codes to user-friendly messages
        let errorMessage = "Nepavyko sukurti projekto"
        if (result.error === 'no_active_membership') {
          errorMessage = "Nepavyko rasti aktyvaus narystės. Patikrinkite, ar esate aktyvus organizacijos narys."
        } else if (result.error) {
          errorMessage = result.error
        }
        toast({
          title: "Klaida",
          description: errorMessage,
          variant: "destructive" as any,
        })
      }
    } catch (error) {
      // Show inline error message
      toast({
        title: "Klaida",
        description: "Nepavyko sukurti projekto",
        variant: "destructive" as any,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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

  // Filter projects from props (server component is source of truth)
  // Use projectsFromServer directly - no local state
  const filteredProjects = projectsFromServer.filter((project) => {
    if (filter === 'active') {
      return project.status !== PROJECT_STATUS.CLOSED && project.status !== PROJECT_STATUS.ARCHIVED
    }
    if (filter === 'closed') {
      return project.status === PROJECT_STATUS.CLOSED
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Projektai</h1>
            <p className="mt-1 text-sm text-slate-600">
              Bendruomenės projektų valdymas
            </p>
          </div>
          {/* Pilot Mode Badge */}
          {pilotMode && isOwner && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              PILOT MODE
            </Badge>
          )}
        </div>
        {isOwner && (
          <Button
            onClick={() => setIsSheetOpen(true)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Pridėti projektą
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Visi
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
          size="sm"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Aktyvūs
        </Button>
        <Button
          variant={filter === 'closed' ? 'default' : 'outline'}
          onClick={() => setFilter('closed')}
          size="sm"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Uždaryti
        </Button>
      </div>

      {/* Projects Grid */}
      {projectsFromServer.length === 0 ? (
        /* Empty state - show when DB has no projects */
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nėra projektų
            </h3>
            {isOwner && (
              <p className="text-sm text-muted-foreground mb-4">
                Paspauskite &quot;Pridėti projektą&quot; norint sukurti naują projektą.
              </p>
            )}
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        /* No projects match current filter */
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nėra projektų, atitinkančių pasirinktą filtą.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <Link
                href={`/dashboard/${orgSlug}/projects/${project.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium text-slate-900 truncate">
                      {project.title}
                    </h4>
                    <Badge variant={getStatusBadgeVariant(project.status)} className="shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  {project.budget_eur !== null && project.budget_eur > 0 && (
                    <p className="text-sm font-medium text-slate-900 mt-1">
                      Biudžetas: {project.budget_eur.toFixed(2)} €
                    </p>
                  )}
                </div>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Atidaryti meniu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${orgSlug}/projects/${project.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Peržiūrėti
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Sheet */}
      {isOwner && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Pridėti projektą</SheetTitle>
              <SheetDescription>
                Sukurkite naują bendruomenės projektą
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="project-title">
                  Pavadinimas <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project-title"
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Projekto pavadinimas"
                  disabled={isSubmitting}
                  className="mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      handleCreateProject()
                    }
                  }}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreateProject}
                  disabled={isSubmitting}
                  className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isSubmitting ? "Kuriama..." : "Sukurti"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsSheetOpen(false)
                    setProjectTitle('')
                  }}
                  disabled={isSubmitting}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Atšaukti
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

