/**
 * Logo Configuration
 * 
 * Development mode configuration for custom logos.
 * Set these environment variables in .env.local for development:
 * 
 * NEXT_PUBLIC_LOGO_PATH=/path/to/logo.png
 * NEXT_PUBLIC_LOGO_ICON_PATH=/path/to/logo-icon.png
 */

export const logoConfig = {
  /**
   * Full logo path (for development)
   * Supports: SVG, PNG, JPG
   */
  fullLogoPath: process.env.NEXT_PUBLIC_LOGO_PATH || '/logo.svg',
  
  /**
   * Icon-only logo path (for development)
   * Supports: SVG, PNG, JPG
   */
  iconLogoPath: process.env.NEXT_PUBLIC_LOGO_ICON_PATH || '/logo-icon.svg',
  
  /**
   * Whether to use custom logos (development mode only)
   */
  useCustomLogos: process.env.NODE_ENV === 'development' && (
    !!process.env.NEXT_PUBLIC_LOGO_PATH || 
    !!process.env.NEXT_PUBLIC_LOGO_ICON_PATH
  ),
}

