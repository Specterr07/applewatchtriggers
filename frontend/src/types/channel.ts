// Telegram channel shapes from routes/telegram.py.

// POST /api/channels/telegram/link
export type TelegramLinkResponse = {
  ok: true
  code: string // one-time pairing code, e.g. "lnk_1a2b3c4d"
  // t.me deep link; an empty string when TELEGRAM_BOT_USERNAME isn't set on the server.
  link_url: string
  expires_in_minutes: number
}

// POST /api/channels/test
export type TestMessageResponse = {
  ok: true
  message: string
}
