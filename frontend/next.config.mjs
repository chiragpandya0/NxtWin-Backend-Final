// In development the Next dev server forwards API calls to the backend, so the browser only
// talks to one origin for HTTP (same as production behind nginx). Sockets: see .env.development.
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5500";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // afterFiles: the app's own routes (e.g. /api/gemini/predict) take priority
      afterFiles: [
        { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
        { source: "/health", destination: `${BACKEND_URL}/health` },
      ],
    };
  },
};

export default nextConfig;
