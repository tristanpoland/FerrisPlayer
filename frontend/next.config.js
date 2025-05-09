/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // For most Next.js versions, no additional configuration is needed for CSS
    // Below is only needed for special cases
    webpack: (config) => {
      return config;
    },
    images: {
      domains: ['via.placeholder.com'],
    },
  }
  
  module.exports = nextConfig