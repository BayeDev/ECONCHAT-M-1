import type { NextConfig } from 'next';

// Ensure API URL has protocol
let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
if (apiUrl && !apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
  apiUrl = `https://${apiUrl}`;
}

const nextConfig: NextConfig = {
  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
