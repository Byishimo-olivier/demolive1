import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = (env.VITE_DEV_API_TARGET || 'http://localhost:4000').replace(/\/$/, '');

  return {
  server: {
    host: "0.0.0.0",
    port: 4545,
    strictPort: true,
    allowedHosts: true,
    // Hot reload shares the dev server's port (whatever --port says)
    hmr: {
      protocol: "ws",
      host: "localhost",
    },
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
      },
      // Files the API serves (uploaded photos, documents)
      '/uploads': {
        target: apiTarget,
        changeOrigin: true,
        secure: true,
      },
    },
  },

  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
