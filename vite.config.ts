import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf': ['@react-pdf/renderer'],
          'vendor-nivo': ['@nivo/bar', '@nivo/pie', '@nivo/core'],
          'vendor-xlsx': ['xlsx-js-style'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
  },
});
