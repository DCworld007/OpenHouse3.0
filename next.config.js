/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  images: {
    unoptimized: true,
  },
  // Add explicit configuration for Cloudflare Pages
  experimental: {
    // The runtime is configured at the component/page level instead
  },
}

module.exports = nextConfig 