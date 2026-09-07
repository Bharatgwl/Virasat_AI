import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
function originOf(value: string | undefined, fallback: string) {
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
}
const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL, "https://*.supabase.co");
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.supabase.co",
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}${isDevelopment ? " ws: http:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/seller/dashboard", permanent: true },
      { source: "/catalog", destination: "/seller/catalog", permanent: true },
      { source: "/add-product", destination: "/seller/products/new", permanent: true },
      { source: "/product-review", destination: "/seller/products/review", permanent: true },
      { source: "/inquiries", destination: "/seller/inquiries", permanent: true },
      { source: "/profile", destination: "/seller/profile", permanent: true },
      { source: "/register", destination: "/seller/register", permanent: true },
      { source: "/marketplace", destination: "/buyer/marketplace", permanent: true },
      { source: "/product/:id", destination: "/buyer/products/:id", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
