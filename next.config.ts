import type { NextConfig } from "next";

process.env.BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA ??= "true";
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= "true";

const nextConfig: NextConfig = {
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
  // Needed after upgrading Next 16.2.x: QA scripts hit 127.0.0.1 in dev.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  transpilePackages: ['phaser'],
};

export default nextConfig;
