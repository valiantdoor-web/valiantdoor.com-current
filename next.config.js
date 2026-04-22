/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.builder.io',
      },
      {
        protocol: 'https',
        hostname: '**.valiantdoor.com',
      },
    ],
    unoptimized: false,
  },

  // API routes and redirects
  async redirects() {
    return [
      // Redirect old static routes to new Next.js routes
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Headers for SEO and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_BUILDER_API_KEY: process.env.NEXT_PUBLIC_BUILDER_API_KEY,
  },
};

module.exports = nextConfig;
