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
    serverComponentsExternalPackages: ['sharp'],
  },
  // External packages that shouldn't be bundled in server components
  serverExternalPackages: [],
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer-when-downgrade",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
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
    config.externals = [...config.externals, 'canvas', 'jsdom'];
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
  // Force all API routes to use Edge runtime
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname
  },
  // Important: Configure all routes to use Edge runtime by default
  // This fixes Cloudflare Pages deployment issues
  runtime: 'edge',
}

export default nextConfig; 