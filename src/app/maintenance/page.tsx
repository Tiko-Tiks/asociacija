import { Logo } from '@/components/ui/logo'
import { logoConfig } from '@/lib/logo-config'

export const metadata = {
  title: 'Priežiūra - Bendruomenių Branduolys',
  description: 'Sistema laikinai nepasiekiama dėl priežiūros darbų',
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo
            variant="icon"
            size="xl"
            showText={false}
            customIconPath={logoConfig.useCustomLogos ? logoConfig.iconLogoPath : undefined}
            useVideo={logoConfig.useVideoLogo}
            customVideoPath={logoConfig.useVideoLogo ? logoConfig.videoLogoPath : undefined}
          />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">
            Sistema laikinai nepasiekiama
          </h1>
          <p className="text-lg text-slate-600">
            Atliekame priežiūros darbus
          </p>
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                Grįžtame netrukus
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Jei turite skubių klausimų, susisiekite su mumis el. paštu
          </p>
          <p className="text-sm text-slate-600 font-medium mt-2">
            admin@branduolys.lt
          </p>
        </div>
      </div>
    </div>
  )
}

