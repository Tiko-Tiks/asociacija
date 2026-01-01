import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Scale, Shield, ArrowRight } from 'lucide-react'

interface LegalSectionProps {
  title?: string
  content?: string
}

/**
 * Legal Base Section ("Teisinis Pamatas")
 * 
 * Constitution First philosophy.
 * Displays links to:
 * - Platformos Chartija (Charter)
 * - Naudojimo Taisyklės (Rules)
 * - Privatumo Politika (GDPR)
 * 
 * Content can be managed via admin panel.
 */
export function LegalSection({ title, content }: LegalSectionProps) {
  const displayTitle = title || 'Teisinis Pamatas'
  const displayContent = content || 'Constitution First – skaidrumas ir teisinė pagrįstumas yra mūsų pagrindas'
  const legalDocs = [
    {
      icon: FileText,
      title: 'Platformos Chartija',
      description: 'Pagrindiniai principai ir tikslai',
      href: '/charter', // Placeholder - actual route to be created
      color: 'blue',
    },
    {
      icon: Scale,
      title: 'Naudojimo Taisyklės',
      description: 'Platformos naudojimo sąlygos',
      href: '/rules', // Placeholder - actual route to be created
      color: 'green',
    },
    {
      icon: Shield,
      title: 'Privatumo Politika',
      description: 'Duomenų apsauga ir GDPR',
      href: '/privacy-policy', // Placeholder - actual route to be created
      color: 'purple',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            {displayTitle}
          </h2>
          {displayContent && (
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {displayContent}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {legalDocs.map((doc) => {
            const Icon = doc.icon
            return (
              <Card key={doc.title} className="border-2 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <div className={`h-12 w-12 rounded-lg ${colorClasses[doc.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{doc.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600 text-sm">
                    {doc.description}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={doc.href}>
                      Skaityti daugiau
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

