import Image from 'next/image'

interface LogoSpinnerProps {
  size?: number
  className?: string
}

/**
 * Animated logo spinner component for loading states
 * Uses the brand logo with rotation animation
 */
export function LogoSpinner({ size = 64, className = '' }: LogoSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div className="animate-spin">
          <Image
            src="/logo.svg"
            alt="Branduolys"
            width={size}
            height={size}
            className="opacity-80"
            priority
          />
        </div>
      </div>
    </div>
  )
}

