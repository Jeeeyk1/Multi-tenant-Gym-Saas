import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile workspace packages so Next.js can process their TypeScript source.
  transpilePackages: ['@gym-saas/ui', '@gym-saas/contracts', '@gym-saas/utils'],
};

export default nextConfig;
