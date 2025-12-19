import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
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
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com https://www.google.com https://www.recaptcha.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: ${process.env.NEXT_PUBLIC_API_URL || ''}; media-src 'self' data: https: ${process.env.NEXT_PUBLIC_API_URL || ''}; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || ''} ${process.env.NEXT_PUBLIC_SOCKET_URL || ''} https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://foodswipe-be395.firebaseapp.com https://foodswipe-be395.firebasestorage.app; frame-src 'self' https://foodswipe-be395.firebaseapp.com https://www.google.com https://www.recaptcha.net https://recaptcha.google.com;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
