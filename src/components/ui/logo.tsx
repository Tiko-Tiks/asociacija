'use client'

import Image from 'next/image'
import { useState } from 'react'

interface LogoProps {
  /**
   * Logo variant: 'full' (with text) or 'icon' (icon only)
   */
  variant?: 'full' | 'icon'
  /**
   * Logo size
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * Custom width (overrides size)
   */
  width?: number
  /**
   * Custom height (overrides size)
   */
  height?: number
  /**
   * Custom className
   */
  className?: string
  /**
   * Show text label
   */
  showText?: boolean
  /**
   * Custom logo path (for development mode)
   */
  customLogoPath?: string
  /**
   * Custom icon path (for development mode)
   */
  customIconPath?: string
}

const sizeMap = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
  xl: { width: 80, height: 80 },
}

/**
 * Logo Component
 * 
 * Supports:
 * - SVG logos (default)
 * - Image logos (PNG, JPG) via customLogoPath
 * - Icon-only mode
 * - Development mode with custom paths
 */
export function Logo({
  variant = 'full',
  size = 'md',
  width,
  height,
  className = '',
  showText = true,
  customLogoPath,
  customIconPath,
}: LogoProps) {
  const [imageError, setImageError] = useState(false)

  // Development mode: check for custom logo paths
  const isDev = process.env.NODE_ENV === 'development'
  const useCustomLogo = isDev && customLogoPath
  const useCustomIcon = isDev && customIconPath && variant === 'icon'

  // Determine logo source
  let logoSrc: string
  if (useCustomIcon) {
    logoSrc = customIconPath
  } else if (useCustomLogo && variant === 'full') {
    logoSrc = customLogoPath
  } else if (variant === 'icon') {
    logoSrc = '/logo-icon.svg' // Icon-only version (to be created)
  } else {
    logoSrc = '/logo.svg' // Default full logo
  }

  // Fallback to default if custom image fails to load
  if (imageError && (useCustomLogo || useCustomIcon)) {
    logoSrc = variant === 'icon' ? '/logo-icon.svg' : '/logo.svg'
  }

  const dimensions = width && height 
    ? { width, height }
    : sizeMap[size]

  // Icon-only mode
  if (variant === 'icon' && !showText) {
    return (
      <Image
        src={logoSrc}
        alt="Branduolys"
        width={dimensions.width}
        height={dimensions.height}
        className={className}
        onError={() => setImageError(true)}
        priority
      />
    )
  }

  // Full logo with text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={logoSrc}
        alt="Lietuvos Bendruomenių Branduolys"
        width={dimensions.width}
        height={dimensions.height}
        className="flex-shrink-0"
        onError={() => setImageError(true)}
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-900">Bendruomenių Branduolys</h1>
          <p className="text-xs text-slate-600">Lietuvos bendruomenių platforma</p>
        </div>
      )}
    </div>
  )
}

