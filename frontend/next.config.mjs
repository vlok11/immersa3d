/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['three'],
    // EdgeOne 部署时建议开启 output: 'export' (纯静态) 或保持默认 (SSR)。
    // 这里保持动态，以便通过环境变量控制 API 地址。
    async rewrites() {
        return [
            // 生产环境: Vercel/EdgeOne 会忽略这里，需要在平台设置 Rewrites 或让前端直接请求 API_URL
            // 本地开发: 代理到 docker 或 localhost
            {
                source: '/api/:path*',
                destination: process.env.NEXT_PUBLIC_API_URL 
                    ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` 
                    : 'http://localhost:8080/api/:path*',
            },
            {
                source: '/ai-service/:path*',
                destination: process.env.NEXT_PUBLIC_AI_URL 
                    ? `${process.env.NEXT_PUBLIC_AI_URL}/:path*` 
                    : 'http://localhost:8000/:path*',
            },
        ];
    },
};

export default nextConfig;
