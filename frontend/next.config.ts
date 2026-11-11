import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Used by the Docker image; Vercel ignores it.
  output: "standalone",
};

export default nextConfig;
