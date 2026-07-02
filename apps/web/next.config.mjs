/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // pnpm stores packages at the workspace root; Turbopack must be allowed to
    // resolve the symlink targets outside apps/web.
    root: new URL("../..", import.meta.url).pathname,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
