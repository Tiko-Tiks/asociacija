import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

export function TransparencyFooter() {
  return (
    <footer className="py-8 md:py-12 bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Platform Attribution */}
          <div className="text-center space-y-4">
            <p className="text-sm">
              Veikia su{' '}
              <Link
                href="/"
                className="text-blue-400 hover:text-blue-300 underline font-medium"
              >
                Bendruomenių Branduolys
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2">
              <Link
                href="/chartija"
                className="text-sm text-blue-400 hover:text-blue-300 underline"
              >
                Platformos Chartija
              </Link>
            </div>
          </div>

          {/* Certification Status */}
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-800">
            <Shield className="h-4 w-4 text-green-400" />
            <Badge variant="outline" className="border-green-400 text-green-400">
              Patvirtinta platforma
            </Badge>
          </div>

          {/* Additional Info */}
          <div className="text-center text-xs text-slate-500 pt-4">
            <p>
              Ši bendruomenė naudoja atviro kodo platformą, skirta demokratiniam valdymui
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

