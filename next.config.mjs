/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverExternalPackages: ['@prisma/client'],
  },
  // ... rest of config ...
}

export default nextConfig; 