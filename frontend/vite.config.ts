import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The backend URL. In development the Vite dev server proxies /api to the
// FastAPI server so no hardcoded host is needed. For production builds,
// set VITE_API_URL at build time (see the Dockerfile).
const apiUrl = process.env.VITE_API_URL || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiUrl,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
