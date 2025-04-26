const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: true
})

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
  webpack: (config, { dev, isServer }) => {
    // Only optimize in production builds
    if (!dev) {
      config.cache = {
        type: 'filesystem',
        // Limit cache size
        maxMemoryGenerations: 1,
        // Store cache in .next/cache instead of node_modules
        cacheDirectory: '.next/cache/webpack',
        // Clean up old caches
        compression: 'gzip',
        // Only cache production files
        name: isServer ? 'server' : 'client',
        // Cache version - bump this if you change webpack config
        version: '1.0.0'
      }

      config.optimization = {
        ...config.optimization,
        // Enable tree shaking
        usedExports: true,
        // Minimize output
        minimize: true,
        // Split chunks efficiently
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 20000000, // 20MB chunks
          cacheGroups: {
            // Framework chunks (React, Next.js)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|@react|next|@next)[\\/]/,
              priority: 40,
              chunks: 'all',
              enforce: true,
            },
            // Large libraries
            lib: {
              test: /[\\/]node_modules[\\/](leaflet|mapbox-gl|framer-motion|@dnd-kit)[\\/]/,
              name: 'lib',
              chunks: 'async',
              priority: 30,
              maxSize: 20000000,
            },
            // Common code between pages
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
              chunks: 'async',
            }
          }
        }
      }
    }
    return config
  },
  experimental: {
    optimizeCss: true, // This will inline critical CSS
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
}

module.exports = withBundleAnalyzer(nextConfig) 