import type { NextConfig } from 'next';

/**
 * The browser only talks to this Next.js server; /api and /uploads are proxied to the NestJS backend.
 * Same origin => the httpOnly auth cookie "just works" (no CORS, no third-party cookie issues).
 */
const API_URL = process.env.API_URL || 'http://localhost:3001';

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_URL}/uploads/:path*` },
    ];
  },
};

export default config;
