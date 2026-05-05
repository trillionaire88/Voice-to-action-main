import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-dates':  ['date-fns'],
          'vendor-charts': ['recharts'],
          'vendor-three':  ['three'],
          'vendor-pdf':    ['jspdf', 'html2canvas'],
          'vendor-map':    ['leaflet', 'react-leaflet'],
          'vendor-motion': ['framer-motion'],
          'vendor-sentry': ['@sentry/react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})
