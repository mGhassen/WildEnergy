import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "public/assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  base: '/',
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    manifest: true,
  },
  server: {
    port: 3001, // Different port than the Express server
    strictPort: true,
    proxy: {
      '^/api/.*': {
        target: 'http://localhost:3000', // Proxy API requests to Express
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3001,
  },
});
