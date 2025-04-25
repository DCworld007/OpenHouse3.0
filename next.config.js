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
  }
}

module.exports = nextConfig 