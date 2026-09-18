import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Matikan PWA saat dev agar tidak ribet cache
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // PWA plugin menambahkan webpack config; ini memberi tahu Next.js 16
  // bahwa Turbopack sengaja dipakai untuk dev (PWA dimatikan saat development).
  turbopack: {},
};

export default withPWA(nextConfig);