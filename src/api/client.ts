import { ERROR_CODES, type ApiResponse } from '../types';
import { handleMockRequest, isMockModeEnabled } from './mockServer';

/** All requests go through the Vite dev proxy to avoid CORS issues (see vite.config.ts). */
export const BASE_URL = '/api-proxy';

/** Error thrown for every non-2xx response. `code` is the HTTP status (e.g. 451–469). */
export class ApiError extends Error {
  code: number;
  response: ApiResponse;

  constructor(code: number, response: ApiResponse) {
    super(response.message || `HTTP ${code}`);
    this.code = code;
    this.response = response;
  }
}

/** Converts API and network errors into human-readable messages with status codes. */
export function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = ERROR_CODES[error.code];
    if (mapped) {
      return `Fehler ${error.code}: ${mapped}`;
    }
    if (error.code === 404) {
      return 'HTTP 404 (Not Found): Der HSE-Chat-Server (www2.hs-esslingen.de/~chkohl/chat) ist auf dem Hochschul-Webserver momentan nicht erreichbar (offline).';
    }
    if (error.code >= 500) {
      return `Serverfehler (${error.code}): Der Chat-Server ist derzeit nicht erreichbar.`;
    }
    return `HTTP ${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Netzwerkfehler: Keine Verbindung zum Chat-Server möglich.';
    }
    return error.message;
  }
  return String(error);
}

type Params = Record<string, string | number | boolean | undefined>;

/**
 * The chat server has a single endpoint. The command is selected via `request`:
 * - GET:  everything as query parameters
 * - POST: everything (including `request`) as JSON body
 */
export async function request<T = ApiResponse>(
  method: 'GET' | 'POST',
  name: string,
  params: Params = {},
): Promise<T> {
  if (isMockModeEnabled()) {
    return handleMockRequest<T>(name, params);
  }

  let url = `${BASE_URL}/`;
  const init: RequestInit = { method, headers: { Accept: 'application/json' } };

  if (method === 'GET') {
    const query = new URLSearchParams({ request: name });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    url += `?${query}`;
  } else {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify({ request: name, ...params });
  }

  const res = await fetch(url, init);

  // Read the body only once, then try to parse it as JSON.
  const text = await res.text();
  let data: ApiResponse;
  try {
    data = JSON.parse(text);
  } catch {
    const isHtml = /^\s*<!doctype|^\s*<html/i.test(text);
    const cleanMessage = isHtml
      ? res.status === 404
        ? 'Chat-Endpunkt (~chkohl/chat) auf www2.hs-esslingen.de nicht gefunden (404 Not Found).'
        : `HTTP ${res.status} (${res.statusText || 'Server Error'})`
      : text || res.statusText;
    data = { status: res.ok ? 'ok' : 'error', code: res.status, message: cleanMessage };
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
