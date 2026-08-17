import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/jobs/process-issuance": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
