// Telegram channel endpoints. There's no way to ask the server whether a
// chat is linked (spec §4.8), so the app only creates link codes and sends
// test messages.

import { apiFetch } from '@/api/client'
import type { TelegramLinkResponse, TestMessageResponse } from '@/types/channel'

// Creates a one-time, 10-minute pairing code (and a t.me link when the
// server knows its bot's username).
export function createTelegramLink(): Promise<TelegramLinkResponse> {
  return apiFetch<TelegramLinkResponse>('/api/channels/telegram/link', { method: 'POST' })
}

// Sends "Test ✅" to the linked chat. Fails with the server's message
// (e.g. "No channel linked for user") when nothing is linked.
export function sendTestMessage(): Promise<TestMessageResponse> {
  return apiFetch<TestMessageResponse>('/api/channels/test', { method: 'POST' })
}
