import type { NextConfig } from 'next';

/**
 * Production = STATIC EXPORT: `npm run build` writes plain HTML/JS/CSS to ./out, which you upload to cPanel.
 * No Node process is needed for the frontend. The browser talks to the API directly at NEXT_PUBLIC_API_URL
 * (set it at build time, e.g. https://api.yourdomain.com).
 *
 * Development (`npm run dev`) keeps the old convenience: /api and /uploads are proxied to the NestJS backend,
 * so NEXT_PUBLIC_API_URL can stay empty and everything is same-origin on localhost.
 */
const API_URL = process.env.API_URL || 'http://localhost:3001';
const dev = process.env.NODE_ENV !== 'production';

const config: NextConfig = {
  output: 'export',
  trailingSlash: !dev, // build only: /dashboard/ -> dashboard/index.html, works on any Apache without rewrite rules
  images: { unoptimized: true },
  devIndicators: false,
  ...(dev
    ? {
        async rewrites() {
          return [
            { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
            { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
          ];
        },
      }
    : {}),
};

export default config;
