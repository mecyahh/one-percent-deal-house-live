/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // IMPORTANT:
  // If you had `output: 'export'` in here, REMOVE IT.
  // Static export causes "Export encountered errors" + stack overflow with our app pages.
}

module.exports = nextConfig
