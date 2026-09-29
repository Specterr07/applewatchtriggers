import '@fontsource-variable/inter'
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

// Entry point for the Vite build: renders the app into <div id="root"> in
// index.html. If that div is ever missing we fail loudly here rather than
// showing a silent blank page.
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find <div id="root"> in index.html to mount the app.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
