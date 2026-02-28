import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  // MVP production: don't fail image build due to existing lint debt.
  eslint: { ignoreDuringBuilds: true },
};

export default function nextConfig(phase) {
  return {
    ...baseConfig,
    // Prevent dev-server assets from being corrupted by `next build`.
    // With separate dirs, dev uses `.next-dev`, build uses `.next`.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
  };
}

