import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path";

export default defineConfig({
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
});