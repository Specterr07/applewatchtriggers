/// <reference types="vite/client" />

// Pulls in Vite's ambient type declarations so TypeScript understands
// non-code imports like `import 'tldraw/tldraw.css'` during `tsc -b`.
// Without this, tsc fails on the CSS side-effect import even though Vite
// bundles it fine.
