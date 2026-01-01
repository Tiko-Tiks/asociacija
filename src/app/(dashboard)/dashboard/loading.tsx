import { LogoSpinner } from '@/components/ui/logo-spinner'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center space-y-4">
        <LogoSpinner size={64} />
        <p className="text-sm font-medium text-slate-600">Kraunama...</p>
      </div>
    </div>
  )
}

