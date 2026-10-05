import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    // Playwright runs its own dev server; a separate build dir keeps it from colliding with `pnpm dev`.
    distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
