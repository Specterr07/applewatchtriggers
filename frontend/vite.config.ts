import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: '/canvas/' - the built HTML will reference assets as /canvas/assets/...
// which matches the Flask route we'll add to serve this app.
export default defineConfig({
  plugins: [react()],
  base: '/canvas/',
  build: {
    outDir: 'dist',
  },
})
