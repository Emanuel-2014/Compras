/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Permitir origenes de desarrollo para evitar advertencias de CORS en /_next/*
  allowedDevOrigins: [
    'http://localhost:3000',
    // Permitir túneles de Cloudflare
    'https://auto-andale-mins-found.trycloudflare.com',
    'https://solicituddecompras.polloaldia.com',
    // Permitir cualquier IP de red local (192.168.*.*)
    ...Array.from({ length: 256 }, (_, i) => `http://192.168.0.${i}`),
    ...Array.from({ length: 256 }, (_, i) => `http://192.168.0.${i}:3000`),
    ...Array.from({ length: 256 }, (_, i) => `http://192.168.1.${i}`),
    ...Array.from({ length: 256 }, (_, i) => `http://192.168.1.${i}:3000`),
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
  },
  // serverExternalPackages: ['better-sqlite3-multiple-ciphers'],
};

export default nextConfig;
