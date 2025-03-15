/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["lucide-react"],
  swcMinify: false,
  experimental: {
    forceSwcTransforms: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://shwsckbvbt.a.pinggy.link/api/:path*'
      }
    ]
  }
}

module.exports = nextConfig
