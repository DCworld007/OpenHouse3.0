/** @type {import('next').NextConfig} */
const nextConfig = {
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
    serverExternalPackages: ['@prisma/client'],
    serverActions: {
      enabled: true,
      allowedOrigins: ['localhost:3000', 'openhouse3-0.vercel.app'],
      bodySizeLimit: '2mb'
    },
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
  productionBrowserSourceMaps: false,
  compress: true,
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        // Allow requests from all Vercel preview deployments and localhost
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.VERCEL_ENV === 'production' 
              ? 'https://unifyplan.vercel.app'
              : '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, Cookie'
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true'
          }
        ],
      },
    ]
  }
}

export default nextConfig;