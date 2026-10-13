import type { NextConfig } from "next";

// Dev bypass is explicit opt-in (AUTH_DEV_BYPASS=true) and never exposed
// with role details. Role stays server-only in src/lib/auth/dev.ts.
const devAuthBypassEnabled =
  process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_BYPASS === "true";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_DEV_AUTH_BYPASS: devAuthBypassEnabled ? "true" : "false",
  },
  reactCompiler: true,
  poweredByHeader: false,
  compress: true,
  images: {
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        port: "",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
