import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gym-saas/ui', '@gym-saas/contracts', '@gym-saas/utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

export default nextConfig;
