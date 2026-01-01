import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivePosition } from '@/app/actions/public-community-page'

interface CommunityAboutSectionProps {
  description: string | null
  activePositions: ActivePosition[]
}

export function CommunityAboutSection({
  description,
  activePositions,
}: CommunityAboutSectionProps) {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Description */}
          {description && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                Apie mus
              </h2>
              <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          {/* Active Positions */}
          {activePositions.length > 0 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                Valdyba
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePositions.map((position) => (
                  <Card key={position.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        {position.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-slate-900">
                        {position.full_name || 'Nepriskyrimas'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!description && activePositions.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>Informacija apie bendruomenę ruošiama</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

