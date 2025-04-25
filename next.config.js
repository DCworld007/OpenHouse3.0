/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'standalone',
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com'], // For Google Auth profile pictures
  },
  // Ensure compatibility with Cloudflare Pages
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  // Add Cloudflare-specific settings
  env: {
    NEXT_PUBLIC_CLOUDFLARE_PAGES: 'true',
  },
  // Optimize for Cloudflare Pages
  poweredByHeader: false,
  generateEtags: false,
}

module.exports = nextConfig 