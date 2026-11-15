import type { NextConfig } from 'next';

// Portability: no Vercel-only features; images load straight from source CDNs.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
