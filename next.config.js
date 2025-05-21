/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google Auth profile pictures
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      enabled: true,
      allowedOrigins: ['localhost:3000', 'openhouse3-0.vercel.app'],
      bodySizeLimit: '2mb'
    },
    optimizePackageImports: ['@heroicons/react', '@headlessui/react']
  },
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Enable compression
  compress: true,
  // Configure trailing slash behavior
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configure API routes to use Node.js runtime
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Ensure Prisma works in production
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, '@prisma/client'];
    }
    return config;
  },
} 