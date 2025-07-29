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
  esbuild: {
    drop: ['console', 'debugger'],
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
    minify: 'esbuild',
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        // Add cache busting for better service worker handling
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // 🚀 PHASE 2 OPTIMIZATION: Enhanced code splitting for better performance
          // Core React libraries - loaded immediately
          'react-vendor': ['react', 'react-dom'],
          // Router - loaded when navigating
          'router-vendor': ['react-router-dom'],
          // UI component libraries - loaded when UI components are rendered
          'ui-vendor': ['@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-tabs', 'lucide-react'],
          // Charts - only loaded when dashboard charts are needed
          'chart-vendor': ['recharts'],
          // Date/time utilities - loaded when date pickers are used
          'date-vendor': ['date-fns', 'date-fns-tz', 'moment-timezone'],
          // Form handling - loaded when forms are rendered
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Authentication utilities - loaded immediately
          'auth-vendor': ['jwt-decode'],
          // Utility libraries - loaded as needed
          'utils-vendor': ['clsx', 'tailwind-merge'],
          // Map functionality - only loaded when location features are used
          'map-vendor': ['leaflet', 'react-leaflet'],
          // Office/PDF functionality - only loaded when generating reports
          'office-vendor': ['xlsx', 'jspdf'],
          // Dashboard specific chunks for lazy loading
          'dashboard-vendor': ['@headlessui/react']
        }
      }
    }
  }
})
