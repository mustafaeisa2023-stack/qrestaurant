/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  // Tell Next.js not to bundle these on the server side
  serverExternalPackages: ['socket.io-client'],

  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '4000' },
      { protocol: 'https', hostname: '**' },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent socket.io-client from being processed server-side
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        'socket.io-client',
      ];
    }
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;