import type { ApiResponse } from '../types';

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
    data = { status: res.ok ? 'ok' : 'error', code: res.status, message: text || res.statusText };
  }

  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
