import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'upload.wikimedia.org',
            },
            {
                protocol: 'https',
                hostname: 'commondatastorage.googleapis.com',
            },
            {
                protocol: 'https',
                hostname: 'foodswipe-production-46d6.up.railway.app',
            },
            {
                protocol: 'https',
                hostname: 'foodswipe-backend.vercel.app',
            },
            {
                protocol: 'https',
                hostname: 'foodswipe-6178.onrender.com',
            }
        ],
    },
    async redirects() {
        /*
        if (process.env.ADMIN_ONLY === 'true') {
            return [
                {
                    source: '/',
                    destination: '/admin',
                    permanent: false,
                },
            ];
        }
        */
        return [];
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Cross-Origin-Opener-Policy",
                        value: "unsafe-none",
                    },
                    {
                        key: "Cross-Origin-Embedder-Policy",
                        value: "unsafe-none",
                    },
                ],
            },
        ];
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    output: 'export',
    distDir: 'out',
    trailingSlash: true,
    transpilePackages: ['framer-motion'],
};

export default nextConfig;
