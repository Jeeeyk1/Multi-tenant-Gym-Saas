import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gym-saas/contracts'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default nextConfig;
