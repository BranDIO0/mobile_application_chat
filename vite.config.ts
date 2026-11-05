import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const proxy = {
  '/api-proxy': {
    target: 'https://www2.hs-esslingen.de/~chkohl/chat',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
});
