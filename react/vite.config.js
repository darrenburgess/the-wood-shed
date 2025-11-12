import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Base path for production - use relative paths for flexible deployment
  base: './',
  // Build configuration
  build: {
    // Output directory relative to project root
    outDir: 'dist',
    // Generate source maps for production debugging
    sourcemap: true,
    // Assets directory name (relative to outDir)
    assetsDir: 'assets',
    // Customize rollup options
    rollupOptions: {
      output: {
        // Customize chunk file names
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
