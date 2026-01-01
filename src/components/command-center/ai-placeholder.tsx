import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export function AIPlaceholder() {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          AI kopilotas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-8 text-center">
          <p className="text-slate-600 text-sm">
            AI kopilotas bus čia
          </p>
          <p className="text-slate-400 text-xs mt-2">
            (netrukus)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

