/// <reference types="vite/client" />

// Pulls in Vite's ambient type declarations so TypeScript understands
// non-code imports like `import './styles/globals.css'` during `tsc -b`.

// Build-time environment variables this app reads (all optional).
interface ImportMetaEnv {
  // Overrides SERVER_TIMEZONE in src/config.ts; must match fly.toml's TIMEZONE.
  readonly VITE_SERVER_TIMEZONE?: string
}
