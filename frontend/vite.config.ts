import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Where Flask runs locally (see CLAUDE.md). `npm run dev` forwards API
// calls there, so the dev server works against the real backend.
const FLASK_DEV_SERVER = 'http://localhost:8080'

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Built files are referenced as /app/assets/..., which routes/pages.py
  // serves - that path never collides with a screen or API URL (spec §8.6).
  // The dev server uses '/' so `npm run dev` opens the app at the same
  // root URLs as production.
  base: command === 'build' ? '/app/' : '/',
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
}))
