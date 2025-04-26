/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Optimize for Cloudflare Pages
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['@heroicons/react'],
  },
  webpack: (config, { isServer }) => {
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      minimize: true,
    }
    return config
  },
}

module.exports = nextConfig 