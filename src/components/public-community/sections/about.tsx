import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PROJECT_STATUS } from '@/app/domain/constants'
import { Calendar, Target, Users } from 'lucide-react'

interface CommunityAboutProps {
  name: string
  description: string | null
  projects: Array<{
    id: string
    title: string
    description: string | null
    status: string
    media_items: Array<{
      id: string
      url: string
      category: string
      created_at: string
    }>
  }>
}

/**
 * About Us Section
 * 
 * Core information about the community:
 * - Short description (2-4 paragraphs)
 * - Mission / activities
 * - Who the community is for
 * - Structure
 * - Management info
 */
export function CommunityAbout({
  name,
  description,
  projects,
}: CommunityAboutProps) {
  return (
    <div className="space-y-8">
      {/* Main Description */}
      <section className="space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Apie mus</h2>
        
        {description ? (
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-slate-50 p-6">
            <p className="text-slate-600 italic">
              Aprašymas dar nepridėtas. Informacija bus atnaujinta netrukus.
            </p>
          </div>
        )}
      </section>

      {/* Mission / Activities */}
      <section className="space-y-4">
        <h3 className="text-2xl font-semibold text-slate-900">Veiklos kryptys</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Tikslai</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Bendruomenės tikslai ir veiklos kryptys
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Narystė</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Kam skirta ši bendruomenė
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Veikla</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Renginiai ir projekto veikla
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Public Projects */}
      {projects.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-2xl font-semibold text-slate-900">Projektai</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <Badge variant="outline">
                      {project.status === PROJECT_STATUS.ACTIVE && 'Aktyvus'}
                      {project.status === PROJECT_STATUS.CLOSED && 'Užbaigtas'}
                      {project.status === PROJECT_STATUS.PLANNED && 'Planuojamas'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-3">
                      {project.description}
                    </p>
                  )}
                  {project.media_items.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {project.media_items.length} nuotrauka
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

