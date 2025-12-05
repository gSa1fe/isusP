import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vorrwzvjfmflhedybhhc.supabase.co', // อนุญาตโดเมน Supabase
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com', // (เผื่อไว้) สำหรับรูปตัวอย่าง
      },
       {
        protocol: 'https',
        hostname: 'placehold.co', // (เผื่อไว้) สำหรับรูปตัวอย่าง
      },
    ],
  },
};

export default nextConfig;