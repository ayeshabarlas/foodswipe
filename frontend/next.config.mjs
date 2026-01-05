/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
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
                hostname: 'colossal-anya-foodswipe-a3e25304.koyeb.app',
            }
        ],
    },
    async redirects() {
        if (process.env.ADMIN_ONLY === 'true') {
            return [
                {
                    source: '/',
                    destination: '/admin',
                    permanent: false,
                },
            ];
        }
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
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
