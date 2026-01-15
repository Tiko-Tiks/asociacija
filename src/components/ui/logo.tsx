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
  /**
   * Organization logo URL (overrides default logo if provided)
   */
  orgLogoUrl?: string | null
  /**
   * Organization name (for alt text when using org logo)
   */
  orgName?: string | null
  /**
   * Use video logo instead of static image
   */
  useVideo?: boolean
  /**
   * Custom video logo path
   */
  customVideoPath?: string
  /**
   * Video autoplay
   */
  videoAutoplay?: boolean
  /**
   * Video loop
   */
  videoLoop?: boolean
  /**
   * Video muted
   */
  videoMuted?: boolean
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
  orgLogoUrl,
  orgName,
  useVideo = false,
  customVideoPath,
  videoAutoplay = true,
  videoLoop = true,
  videoMuted = true,
}: LogoProps) {
  const [imageError, setImageError] = useState(false)

  // Priority: orgLogoUrl > custom paths > default logo
  // Development mode: check for custom logo paths
  const isDev = process.env.NODE_ENV === 'development'
  const useCustomLogo = isDev && customLogoPath
  const useCustomIcon = isDev && customIconPath && variant === 'icon'
  const useOrgLogo = orgLogoUrl && !imageError

  // Determine logo source
  let logoSrc: string
  if (useOrgLogo) {
    logoSrc = orgLogoUrl
  } else if (useCustomIcon) {
    logoSrc = customIconPath
  } else if (useCustomLogo && variant === 'full') {
    logoSrc = customLogoPath
  } else if (variant === 'icon') {
    logoSrc = '/logo-icon.svg' // Icon-only version
  } else {
    logoSrc = '/logo.svg' // Default full logo
  }

  // Fallback to default if custom image fails to load
  if (imageError && (useCustomLogo || useCustomIcon || useOrgLogo)) {
    logoSrc = variant === 'icon' ? '/logo-icon.svg' : '/logo.svg'
  }

  const dimensions = width && height 
    ? { width, height }
    : sizeMap[size]

  // Video logo mode
  const videoPath = customVideoPath || '/VideoLOGO.mp4'
  const shouldUseVideo = useVideo || (isDev && customVideoPath)

  // Icon-only mode with video
  if (variant === 'icon' && !showText && shouldUseVideo) {
    return (
      <video
        src={videoPath}
        width={dimensions.width}
        height={dimensions.height}
        autoPlay={videoAutoplay}
        loop={videoLoop}
        muted={videoMuted}
        playsInline
        className={className}
        style={{ width: dimensions.width, height: dimensions.height, objectFit: 'contain' }}
      />
    )
  }

  // Icon-only mode with image
  if (variant === 'icon' && !showText) {
    return (
      <Image
        src={logoSrc}
        alt={orgName || 'Branduolys'}
        width={dimensions.width}
        height={dimensions.height}
        className={className}
        onError={() => setImageError(true)}
        priority
        unoptimized={!!orgLogoUrl} // Don't optimize external URLs
      />
    )
  }

  // Full logo with text and video
  if (shouldUseVideo) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <video
          src={videoPath}
          width={dimensions.width}
          height={dimensions.height}
          autoPlay={videoAutoplay}
          loop={videoLoop}
          muted={videoMuted}
          playsInline
          className="flex-shrink-0"
          style={{ width: dimensions.width, height: dimensions.height, objectFit: 'contain' }}
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

  // Full logo with text and image
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={logoSrc}
        alt={orgName || 'Lietuvos Bendruomenių Branduolys'}
        width={dimensions.width}
        height={dimensions.height}
        className="flex-shrink-0"
        onError={() => setImageError(true)}
        priority
        unoptimized={!!orgLogoUrl} // Don't optimize external URLs
      />
      {showText && (
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-slate-900">
            {orgName || 'Bendruomenių Branduolys'}
          </h1>
          {!orgName && (
            <p className="text-xs text-slate-600">Lietuvos bendruomenių platforma</p>
          )}
        </div>
      )}
    </div>
  )
}

