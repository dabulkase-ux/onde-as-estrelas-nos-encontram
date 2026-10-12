import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: ['.trycloudflare.com'] },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
});
