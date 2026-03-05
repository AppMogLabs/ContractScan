import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server-side rendering for dynamic contract analysis
  // Static export won't work because we need API routes
  
  // Image optimization (required for some deployments)
  images: {
    unoptimized: true,
  },
  
  // Environment variables available at build time
  env: {
    APP_NAME: "ContractScan",
    APP_VERSION: "1.0.0",
  },
};

export default nextConfig;
