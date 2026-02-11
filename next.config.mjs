/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MVP production: don't fail image build due to existing lint debt.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

