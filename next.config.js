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
    unoptimized: true, // Required for Cloudflare Pages
  },
  // Configure for Cloudflare Pages
  output: 'export',
  distDir: '.output',
  // Disable certain features not supported in static export
  experimental: {
    appDir: true,
    serverActions: true,
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