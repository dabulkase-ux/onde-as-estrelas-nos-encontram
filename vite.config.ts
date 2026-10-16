import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: ['.trycloudflare.com'], proxy: {'/stellar-mail-local':{target:'http://127.0.0.1:5187',changeOrigin:false}} },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'] } } } },
});
