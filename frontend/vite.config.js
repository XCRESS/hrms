import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vendor grouping shared by the chunking strategy below. Rolldown removed the
// object form of `manualChunks`, so the same intent is expressed as an explicit
// id -> chunk lookup driven by `advancedChunks.groups`.
const VENDOR_CHUNKS = {
  'router-vendor': ['react-router'],
  'ui-vendor': [
    '@radix-ui/react-select',
    '@radix-ui/react-popover',
    '@radix-ui/react-tabs',
    'lucide-react',
  ],
  'date-vendor': ['date-fns', 'date-fns-tz', 'luxon'],
  'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
  'auth-vendor': ['jwt-decode'],
  'utils-vendor': ['clsx', 'tailwind-merge'],
  'map-vendor': ['leaflet', 'react-leaflet'],
  'office-vendor': ['xlsx', 'jspdf'],
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // React Compiler (stable 1.0) auto-memoizes components, so manual
    // useMemo/useCallback/React.memo are no longer the default tool.
    // plugin-react v6 runs on oxc rather than Babel, so the compiler is opted
    // into via `babel` here — the plugin pulls in @rolldown/plugin-babel to run
    // just this one Babel pass and leaves the rest of the transform on oxc.
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ensure proper MIME types for JS modules
    assetsInlineLimit: 0,
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
        // Oxc is the default minifier in Vite 8. `esbuild.drop` moved here.
        minify: {
          compress: {
            dropConsole: mode === 'production',
            dropDebugger: mode === 'production',
          },
        },
        // Replaces the removed object form of `manualChunks`. Each group tests
        // module ids against the package name so only real node_modules matches
        // are grouped — a substring test alone would also catch app files whose
        // path happens to contain the dependency name.
        advancedChunks: {
          groups: Object.entries(VENDOR_CHUNKS).map(([name, packages]) => ({
            name,
            test: new RegExp(
              `[\\\\/]node_modules[\\\\/](${packages
                .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|')})[\\\\/]`
            ),
          })),
        },
      }
    }
  }
}))
