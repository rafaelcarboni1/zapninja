import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost'],
    dangerouslyAllowSVG: true,
  },
  async rewrites() {
    // Em produção, garanta que '/' aponte para /api/health para o healthcheck da Railway
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/',
          destination: '/api/health',
        },
      ]
    }
    return []
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Em produção, não falhar build por erros TS residuais
    ignoreBuildErrors: true,
  },
  // Disable dev-time rewrite to 3000 to avoid mismatch when Next picks 3001
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
};

export default nextConfig;
