import os from "node:os";
import type { NextConfig } from "next";

/** This machine's LAN addresses, so a phone on the same Wi-Fi can load the dev server. */
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Keep the dev badge off the bottom nav.
  devIndicators: { position: "top-right" },
  // This folder is iCloud-synced, which drops "LOG 2" duplicates into
  // Turbopack's on-disk cache and crashes `next dev`. Memory cache only.
  experimental: { turbopackFileSystemCacheForDev: false },
  allowedDevOrigins: ["localhost", "127.0.0.1", ...lanHosts],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
