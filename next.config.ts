import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.firebaseapp.com https://*.googleapis.com https://apis.google.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.googleapis.com https://*.googleusercontent.com https://res.cloudinary.com",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://accounts.google.com wss://*.firebaseio.com",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
