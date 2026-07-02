import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Explicitly set the workspace root to prevent Turbopack from
    // misidentifying the root as the /app subdirectory.
    root: __dirname,
  },
};

export default nextConfig;
