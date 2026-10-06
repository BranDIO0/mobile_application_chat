import type { ApiResponse, ChatMessage, ChatRoom, UserProfile } from './types';

const BASE_URL = '/api-proxy';

async function request(method: 'GET' | 'POST', endpoint: string, params: Record<string, any> = {}, body?: any): Promise<ApiResponse> {
  let url = `${BASE_URL}/`;
  const options: RequestInit = { method, headers: { Accept: 'application/json' } };

  if (method === 'GET') {
    const searchParams = new URLSearchParams();
    searchParams.set('request', endpoint);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.set(k, String(v));
    });
    url += `?${searchParams.toString()}`;
  } else {
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    options.body = JSON.stringify({ request: endpoint, ...body });
  }

  const res = await fetch(url, options);
  let data: ApiResponse;
  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    data = { status: res.ok ? 'ok' : 'error', code: res.status, message: text || res.statusText };
  }

  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    (err as any).response = data;
    (err as any).code = res.status;
    throw err;
  }
  return data;
}

export const api = {
  ping: () => request('GET', 'ping'),
  register: (userid: string, password: string, nickname: string, fullname: string) =>
    request('GET', 'register', { userid, password, nickname, fullname }),
  login: (userid: string, password: string) => request('GET', 'login', { userid, password }),
  validateToken: (token: string) => request('GET', 'validatetoken', { token }),
  logout: (token: string) => request('GET', 'logout', { token }),
  getMessages: (token: string, chatid = 0, fromid = 0) =>
    request('GET', 'getmessages', { token, chatid, fromid }) as Promise<ApiResponse & { messages: ChatMessage[] }>,
  postMessage: (token: string, payload: { text?: string; chatid?: number; photo?: string; file?: string; position?: string; important?: boolean }) =>
    request('POST', 'postmessage', {}, { token, ...payload }),
  getChats: (token: string) => request('GET', 'getchats', { token }) as Promise<ApiResponse & { chats: ChatRoom[] }>,
  createChat: (token: string, chatname: string, ispublic = false) =>
    request('GET', 'createchat', { token, chatname, ispublic: ispublic ? 'true' : 'false' }),
  getProfiles: (token: string) => request('GET', 'getprofiles', { token }) as Promise<ApiResponse & { profiles: UserProfile[] }>,
  getPhotoUrl: (photoid: string) => `${BASE_URL}/?request=getphoto&photoid=${encodeURIComponent(photoid)}`,
  getFileUrl: (fileid: string) => `${BASE_URL}/?request=getfile&fileid=${encodeURIComponent(fileid)}`,
};
