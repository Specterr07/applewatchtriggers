import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// A single persistent canvas, stored in the browser's IndexedDB via
// tldraw's built-in "persistenceKey" - no backend/server storage needed,
// no multiplayer sync. It's a personal scratchpad tied to this browser.
export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <a
        href="/"
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          background: '#1a1d24',
          color: '#e8e9ec',
          border: '1px solid #2a2e38',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontFamily: 'sans-serif',
          textDecoration: 'none',
        }}
      >
        ← Back to Task Logger
      </a>
      <Tldraw persistenceKey="task-logger-canvas" />
    </div>
  )
}
