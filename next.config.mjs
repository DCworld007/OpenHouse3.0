// Import OpenNext initialization function
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Initialize OpenNext for Cloudflare
initOpenNextCloudflareForDev();

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
  // External packages that shouldn't be bundled in server components
  serverExternalPackages: [],
  // Optimize bundle size
  webpack: (config, { dev, isServer }) => {
    // Only run in production
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Enable compression
  compress: true,
  // Configure trailing slash behavior
  trailingSlash: false,
  // Configure output mode
  output: 'standalone',
}

export default nextConfig; 