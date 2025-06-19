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
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
