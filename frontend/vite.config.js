import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Disable service worker in development
    headers: {
      'Service-Worker-Allowed': '/'
    }
  },
  build: {
    // Ensure proper MIME types for JS modules
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Add cache busting for better service worker handling
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-tabs'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['date-fns', 'date-fns-tz', 'jwt-decode', 'clsx'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'office-vendor': ['xlsx']
        }
      }
    }
  }
})
