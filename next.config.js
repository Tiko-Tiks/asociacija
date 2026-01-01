/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration
  eslint: {
    // Don't ignore ESLint errors during builds
    ignoreDuringBuilds: false,
  },
  // TypeScript configuration
  typescript: {
    // Temporarily ignore TypeScript errors during builds
    // TODO: Fix Supabase type inference issues properly
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

