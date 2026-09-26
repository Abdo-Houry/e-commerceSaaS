import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

const root = path.join(import.meta.dirname, '..');
// The monorepo keeps a single .env at the root; load it before Next reads NEXT_PUBLIC_* values.
loadEnvConfig(root, process.env.NODE_ENV !== 'production');

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api');
const isLocalApi = ['localhost', '127.0.0.1'].includes(apiUrl.hostname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
  transpilePackages: ['@matjari/shared'],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: apiUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: '/uploads/**',
      },
    ],
    // Uploads are served by the API; in local development that is localhost.
    dangerouslyAllowLocalIP: isLocalApi,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
