const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: true
})
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
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
        // Use absolute path for cache directory
        cacheDirectory: path.resolve('.next/cache/webpack'),
        // Clean up old caches
        compression: 'gzip',
        // Only cache production files
        name: isServer ? 'server' : 'client',
        // Cache version - bump this if you change webpack config
        version: '1.0.0'
      }

      if (!isServer) {
        // Client-side optimizations
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
            maxSize: 90000, // Reduced chunk size for better caching
            cacheGroups: {
              default: false,
              vendors: false,
              framework: {
                name: 'framework',
                test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
                priority: 40,
                enforce: true,
                chunks: 'all'
              },
              lib: {
                test: /[\\/]node_modules[\\/](leaflet|mapbox-gl|framer-motion|@dnd-kit)[\\/]/,
                name: (module) => {
                  const match = module.context.match(/[\\/]node_modules[\\/](.*?)(?:[\\/]|$)/);
                  return `lib-${match[1].replace('@', '')}`; 
                },
                priority: 30,
                minChunks: 1,
                reuseExistingChunk: true,
                chunks: 'all'
              },
              commons: {
                name: 'commons',
                minChunks: 2,
                priority: 20,
                reuseExistingChunk: true,
                chunks: 'all'
              }
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