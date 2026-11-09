import { ERROR_CODES, type ApiResponse } from '../types';
import { getServerMode, handleMockRequest, isMockModeEnabled } from './mockServer';

/** Proxied base URLs (see vite.config.ts) + direct backup server URL fallback. */
export const LIVE_BASE_URL = '/api-proxy';
export const BACKUP_BASE_URL = '/api-backup-proxy';
export const DIRECT_BACKUP_URL = 'https://api.chat.throin.de';

export const BASE_URL = LIVE_BASE_URL;

export function getActiveBaseUrl(): string {
  return getServerMode() === 'backup' ? BACKUP_BASE_URL : LIVE_BASE_URL;
}

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
    if (error.message.startsWith('Apache 403 Forbidden:') || error.message.startsWith('HTTP 404')) {
      return error.message;
    }
    if (error.code === 403 || error.code === 404) {
      if (error.response?.message && !error.response.message.startsWith('HTTP ')) {
        return `Fehlender Parameter (${error.code}): ${error.response.message}`;
      }
    }
    const mapped = ERROR_CODES[error.code];
    if (mapped) {
      return `Fehler ${error.code}: ${mapped}`;
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

function buildRequestUrlAndInit(
  baseUrl: string,
  method: 'GET' | 'POST',
  name: string,
  params: Params,
): { url: string; init: RequestInit } {
  let url = `${baseUrl}/`;
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

  return { url, init };
}

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

  const mode = getServerMode();
  const baseUrl = getActiveBaseUrl();
  const { url, init } = buildRequestUrlAndInit(baseUrl, method, name, params);

  let res = await fetch(url, init);
  let text = await res.text();

  // If backup mode is selected and Vite dev server hasn't reloaded vite.config.ts yet
  // (returning the SPA index.html or 404 HTML for /api-backup-proxy), fall back to direct URL
  if (mode === 'backup' && /^\s*<!doctype|^\s*<html/i.test(text)) {
    try {
      const direct = buildRequestUrlAndInit(DIRECT_BACKUP_URL, method, name, params);
      res = await fetch(direct.url, direct.init);
      text = await res.text();
    } catch {
      // Keep original response if direct fetch is blocked by CORS
    }
  }

  let data: ApiResponse;
  try {
    data = JSON.parse(text);
  } catch {
    const isHtml = /^\s*<!doctype|^\s*<html/i.test(text);
    const serverLabel = mode === 'backup' ? 'api.chat.throin.de' : 'www2.hs-esslingen.de';
    let cleanMessage: string;
    if (isHtml && res.status === 403 && mode === 'live') {
      cleanMessage =
        'Apache 403 Forbidden: Der Hochschul-Webserver (www2.hs-esslingen.de) blockiert /~chkohl/chat/index.php. Bitte auf "Backup-Server" (api.chat.throin.de) oder "Mockup" umschalten.';
    } else if (isHtml && res.status === 404) {
      cleanMessage = `HTTP 404 (Not Found): Chat-Endpunkt auf ${serverLabel} nicht gefunden.`;
    } else if (isHtml) {
      cleanMessage = `HTTP ${res.status} (${res.statusText || 'Server Error'}) auf ${serverLabel}`;
    } else {
      cleanMessage = text || res.statusText;
    }
    data = { status: res.ok ? 'ok' : 'error', code: res.status, message: cleanMessage };
  }

  if (!res.ok || data.status === 'error') {
    throw new ApiError(data.code || res.status, data);
  }
  return data as T;
}
