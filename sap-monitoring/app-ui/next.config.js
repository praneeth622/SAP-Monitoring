/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["lucide-react"],
  swcMinify: false,
  experimental: {
    forceSwcTransforms: false
  }
}

module.exports = nextConfig