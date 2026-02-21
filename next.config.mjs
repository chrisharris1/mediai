/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ADMIN_CODE: process.env.ADMIN_ACCESS_CODE,
  },
};

export default nextConfig;
