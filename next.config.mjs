/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ TypeScript type checking in builds (October 2025 best practice)
  typescript: {
    ignoreBuildErrors: false, // Enforce type safety
  },

  // ✅ Next.js 16: Exclude native modules from server bundling (Turbopack compatibility)
  serverExternalPackages: ['sharp', '@napi-rs/canvas', 'canvas'],

  // ✅ Image optimization (October 2025 best practice)
  images: {
    formats: ['image/webp', 'image/avif'], // Modern formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    // Allow external images from AI providers
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.anthropic.com',
      },
      {
        protocol: 'https',
        hostname: '**.replicate.delivery',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
    ],
  },

  // ✅ Performance optimizations (October 2025)
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // ✅ Turbopack configuration (Next.js 15.5.6+)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // ✅ Security headers (October 2025 best practice)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // ✅ Webpack optimizations (October 2025)
  webpack: (config, { isServer }) => {
    // Client-side: Exclude server-only packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
        sharp: false,
      }
    } else {
      // Server-side: Externalize native modules to prevent bundling
      config.externals = config.externals || []

      // Externalize sharp and @napi-rs/canvas (native binaries)
      config.externals.push({
        sharp: 'commonjs sharp',
        '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
        'canvas': 'commonjs canvas',
      })
    }
    return config
  },

  // ✅ Production optimizations
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
}

export default nextConfig
