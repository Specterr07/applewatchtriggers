// App-wide constants, kept in one place so each value only ever changes here.
// See docs/features/frontend-redesign.md for the reasoning behind each one.

// The React app is served from "/" (it lived under /app during the
// migration; routes/pages.py now 301-redirects those old URLs).
export const ROUTER_BASENAME = ''

// These two keys are shared with static/index.html (and were shared with
// the old canvas app). Renaming either would log everyone out on deploy.
export const API_KEY_STORAGE = 'task_logger_api_key'
export const SESSION_LAST_ACTIVE_STORAGE = 'task_logger_session_last_active'

// Sliding expiry: a session ends after this long with no successful request.
export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000

// Theme preference. index.html reads this same key in a tiny inline script
// before React loads, so if you rename it, rename it there too.
export const THEME_STORAGE = 'sheev_theme'

// When the last Telegram test message was sent successfully (Date.now()
// milliseconds). Browser-only: the server can't report link status (spec §4.8).
export const TELEGRAM_LAST_TEST_STORAGE = 'sheev_telegram_last_test'

// The timezone the server writes timestamps in (spec §8.4). Backend
// timestamps like "2026-09-30 09:05:00" carry no offset - they're wall-clock
// time in this zone. MUST match TIMEZONE in fly.toml; override at build time
// with VITE_SERVER_TIMEZONE if that ever changes.
export const SERVER_TIMEZONE: string = import.meta.env.VITE_SERVER_TIMEZONE || 'Asia/Kolkata'

// Layout breakpoints (spec §6). These match Tailwind's `md` and `lg`
// breakpoints, so JS and CSS agree on when the sidebar appears/expands.
export const MEDIA_HAS_SIDEBAR = '(min-width: 768px)'
export const MEDIA_DESKTOP = '(min-width: 1024px)'
