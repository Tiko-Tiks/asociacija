/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint configuration
  eslint: {
    // Don't ignore ESLint errors during builds
    ignoreDuringBuilds: false,
  },
  // TypeScript configuration
  typescript: {
    // Don't ignore TypeScript errors during builds
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig

