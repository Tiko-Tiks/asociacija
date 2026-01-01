import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Network, Shield, Users } from 'lucide-react'

interface DefinitionSectionProps {
  title?: string
  content?: string
}

/**
 * Definition Section ("Kas tai yra")
 * 
 * 3 columns / cards explaining what the platform is:
 * 1. Infrastructure, not social network
 * 2. Transparency tool, not political organization
 * 3. Help for self-governance, not leadership
 * 
 * Content can be managed via admin panel.
 */
export function DefinitionSection({ title, content }: DefinitionSectionProps) {
  const displayTitle = title || 'Kas tai yra'
  const displayContent = content || 'Bendruomenių Branduolys yra...'

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {displayTitle}
          </h2>
          {displayContent && (
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              {displayContent}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Card 1 */}
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Network className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Tai infrastruktūra</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 leading-relaxed">
                Ne socialinis tinklas. Platforma, skirta bendruomenių veiklos koordinavimui ir valdymui.
              </p>
            </CardContent>
          </Card>

          {/* Card 2 */}
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Tai skaidrumo įrankis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 leading-relaxed">
                Ne politinė organizacija. Skaidrumo ir atsakomybės užtikrinimo sistema.
              </p>
            </CardContent>
          </Card>

          {/* Card 3 */}
          <Card className="border-2 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Tai pagalba savivaldai</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 leading-relaxed">
                Ne vadovavimas. Įrankiai ir struktūra savarankiškam bendruomenės valdymui.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

