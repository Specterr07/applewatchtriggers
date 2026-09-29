import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Where Flask runs locally (see CLAUDE.md). `npm run dev` forwards API
// calls there, so the dev server works against the real backend.
const FLASK_DEV_SERVER = 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Built files are referenced as /app/assets/..., which routes/pages.py
  // serves. This stays '/app/' even after cutover (spec §8.6) - only the
  // router basename in src/config.ts changes then.
  base: '/app/',
  resolve: {
    // `@/...` means `src/...`, so imports don't need long ../../ chains.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': FLASK_DEV_SERVER,
      '/toggle': FLASK_DEV_SERVER,
      '/status': FLASK_DEV_SERVER,
    },
  },
  build: {
    outDir: 'dist',
  },
})
