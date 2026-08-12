import react from '@vitejs/plugin-react'
import fileRouter from './src/plugin/index.ts'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    // The app imports `virtual:file-router/routes.jsx`; outputPath additionally
    // writes those same routes to disk to read while debugging.
    fileRouter({ outputPath: 'src/routes.jsx' }),
    react(),
  ],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
