import type { NextConfig } from 'next';

// Portability: no Vercel-only features; images load straight from source CDNs.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  // Letterboxd/Goodreads exports of heavy users pass Next's 1 MB default; the import action itself caps files at 5 MB.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
