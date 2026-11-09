import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const proxy = {
  '/api-proxy': {
    target: 'https://www2.hs-esslingen.de/~chkohl/chat',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
  },
  '/api-backup-proxy': {
    target: 'https://api.chat.throin.de',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api-backup-proxy/, ''),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
});
