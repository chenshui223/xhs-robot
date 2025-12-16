/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright', 'playwright-extra', 'nodejieba'],
  },
}

module.exports = nextConfig