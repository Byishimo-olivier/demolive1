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
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 4545,
    },
    proxy: {
      '/api': {
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
