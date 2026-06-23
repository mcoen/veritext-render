import type { NextConfig } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql'

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: '/graphql',
  },
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: API_URL,
      },
    ]
  },
}

export default nextConfig
