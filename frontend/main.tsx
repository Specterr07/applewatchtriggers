import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Entry point for the Vite build. It finds the <div id="root"> in index.html
// and renders the tldraw canvas (App) into it. If that div is ever missing,
// getElementById returns null and React throws immediately - which is what we
// want here (a loud failure in the build/preview), not a silent blank page.
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find <div id="root"> in index.html to mount the canvas app.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
