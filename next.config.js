/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  images: {
    unoptimized: true,
  },
  // Add explicit configuration for Cloudflare Pages
  experimental: {
    runtime: 'edge',
  },
}

module.exports = nextConfig 