/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['@prisma/client'],
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