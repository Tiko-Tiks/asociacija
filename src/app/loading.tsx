import { PageLayout } from '@/components/layout/page-layout'
import { LogoSpinner } from '@/components/ui/logo-spinner'

export default function Loading() {
  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center space-y-4">
          <LogoSpinner size={80} />
          <p className="text-lg font-medium text-slate-700">Kraunama...</p>
          <p className="text-sm text-slate-500">Prašome palaukti</p>
        </div>
      </div>
    </PageLayout>
  )
}
