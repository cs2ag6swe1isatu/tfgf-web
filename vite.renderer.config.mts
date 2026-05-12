import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    // Enable CORS for network access
    cors: true,
    // Configure headers for cross-origin access
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  build: {
    emptyOutDir: true,
  },
});
