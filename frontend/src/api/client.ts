// The one place the app talks to the Flask API (spec §8.2: no fetch()
// anywhere else). Every route replies with the same envelope -
// { ok: true, ... } or { ok: false, message } - so errors are handled once
// here and surface as an ApiError carrying the server's own message.

import { getStoredApiKey, touchSession } from '@/utils/session'

// A failed API call. `status` is the HTTP status, or 0 when the server
// couldn't be reached at all (offline, DNS, server down).
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Check your connection."

type RequestOptions = {
  method?: string
  // A FormData body is sent as-is (multipart); anything else is sent as JSON.
  body?: unknown
}

type RawResponse = {
  status: number
  data: { ok?: boolean; message?: string } | null
}

// Called when the server rejects the stored key (401). AuthProvider
// registers this; it's a plain callback so this file stays React-free.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// Sends one request with the given key and parses the JSON body.
// Only throws for network failures; HTTP errors are left to the caller.
export async function sendRequest(
  path: string,
  apiKey: string | null,
  { method = 'GET', body }: RequestOptions = {},
): Promise<RawResponse> {
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-API-Key'] = apiKey

  let requestBody: BodyInit | undefined
  if (body instanceof FormData) {
    // No Content-Type on purpose: the browser adds the multipart boundary.
    requestBody = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(path, { method, headers, body: requestBody })
  } catch (err) {
    console.error(`Request to ${path} failed before reaching the server:`, err)
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0)
  }

  // A proxy or crash page can return HTML instead of our JSON envelope;
  // treat that as "no data" rather than throwing a confusing parse error.
  const data = await response.json().catch(() => null)
  return { status: response.status, data }
}

// Authenticated request with the stored key. Returns the parsed body on
// success; throws ApiError (with the server's message) otherwise.
export async function apiFetch<T>(path: string, options?: RequestOptions): Promise<T> {
  const { status, data } = await sendRequest(path, getStoredApiKey(), options)
  return interpretResponse<T>(status, data)
}

// The shared rules for any authenticated response (used by apiFetch and by
// the voice-note upload in api/notes.ts): 401 signs out, anything else
// keeps the session alive, and a non-2xx or {ok: false} becomes an ApiError.
export function interpretResponse<T>(status: number, data: RawResponse['data']): T {
  if (status === 401) {
    onUnauthorized?.()
    throw new ApiError('Your session is no longer valid. Please log in again.', 401)
  }

  // Same rule as static/index.html: any response that isn't a 401 proves
  // the key still works, so it keeps the 24-hour session alive.
  touchSession()

  if (status < 200 || status >= 300 || !data || data.ok === false) {
    throw new ApiError(data?.message || `Request failed (HTTP ${status}).`, status)
  }
  return data as T
}
