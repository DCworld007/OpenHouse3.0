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
  webpack: (config, { isServer }) => {
    // Enable tree shaking and optimizations
    config.optimization = {
      ...config.optimization,
      minimize: true,
      sideEffects: true,
      usedExports: true,
    }

    // More aggressive code splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 10000,
        maxSize: 20000000, // 20MB to be safe
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|@react|next|@next)[\\/]/,
            priority: 40,
            enforce: true,
            reuseExistingChunk: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            chunks: 'async',
            priority: 30,
            maxSize: 20000000,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
            chunks: 'async',
          },
          shared: {
            name: 'shared',
            enforce: true,
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@?\\w+)[\\/]/,
            priority: 10,
          },
        },
      }
    }

    return config
  },
  experimental: {
    optimizeCss: true, // This will inline critical CSS
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
  },
}

module.exports = nextConfig 