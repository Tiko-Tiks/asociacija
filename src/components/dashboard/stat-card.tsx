import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  iconColor?: 'blue' | 'green' | 'amber' | 'purple'
}

/**
 * Stat Card Component
 * 
 * Displays a metric with icon, value, and subtitle.
 * Used in "At a Glance" section.
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <Card className="border-2 hover:border-blue-500 transition-colors hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <div className={`h-10 w-10 rounded-lg ${colorClasses[iconColor]} flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900 mb-1">
          {value}
        </div>
        <p className="text-xs text-muted-foreground">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  )
}

