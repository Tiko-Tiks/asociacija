import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle2, Key, Settings } from 'lucide-react'

/**
 * How It Works Section (Process)
 * 
 * Simple timeline showing the process:
 * 1. Paraiška (Application)
 * 2. Patikra (Verification)
 * 3. Prieiga (Access)
 * 4. Veikla (Autonomous Operation)
 */
export function ProcessSection() {
  const steps = [
    {
      icon: FileText,
      title: 'Paraiška',
      description: 'Bendruomenė pateikia paraišką platformos naudojimui',
      color: 'blue',
    },
    {
      icon: CheckCircle2,
      title: 'Patikra',
      description: 'Sistemos administratorius peržiūri ir patvirtina paraišką',
      color: 'green',
    },
    {
      icon: Key,
      title: 'Prieiga',
      description: 'Bendruomenė gauna prieigą prie valdymo pulto',
      color: 'purple',
    },
    {
      icon: Settings,
      title: 'Veikla',
      description: 'Bendruomenė savarankiškai valdo savo veiklą',
      color: 'orange',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Kaip tai veikia
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative">
                <Card className="border-2 hover:border-blue-500 transition-colors h-full">
                  <CardHeader>
                    <div className={`h-12 w-12 rounded-lg ${colorClasses[step.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl font-bold text-slate-400">{index + 1}</span>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
                {/* Connector line (hidden on mobile) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-slate-300 transform -translate-y-1/2 z-0">
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-slate-300 border-t-2 border-t-transparent border-b-2 border-b-transparent"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

