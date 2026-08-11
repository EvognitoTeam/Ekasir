import type { NextConfig } from "next";
import packageJson from './package.json';

const nextConfig: NextConfig = {
  env: {
    // Prefix NEXT_PUBLIC_ agar bisa dibaca oleh browser (client-side)
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
