/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Required for Cloudflare Pages
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Optimize for Cloudflare Pages
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
}

module.exports = nextConfig 