import { BASE_URL, request } from './client';
import type { ApiResponse, ChatMessage, ChatRoom, NewMessage, UserProfile } from '../types';

/** One function per chat server command. See https://www2.hs-esslingen.de/~chkohl/chat/docs/ */
export const chatApi = {
  // Account
  register: (userid: string, password: string, nickname: string, fullname: string) =>
    request('GET', 'register', { userid, password, nickname, fullname }),
  login: (userid: string, password: string) => request('GET', 'login', { userid, password }),
  validateToken: (token: string) => request('GET', 'validatetoken', { token }),
  logout: (token: string) => request('GET', 'logout', { token }),

  // Chats & users
  getChats: (token: string) => request<ApiResponse & { chats: ChatRoom[] }>('GET', 'getchats', { token }),
  createChat: (token: string, chatname: string) =>
    request<ApiResponse & { chatid: number }>('GET', 'createchat', { token, chatname, ispublic: true }),
  getProfiles: (token: string) =>
    request<ApiResponse & { profiles: UserProfile[] }>('GET', 'getprofiles', { token }),

  // Messages
  getMessages: (token: string, chatid: number, fromid = 0) =>
    request<ApiResponse & { messages: ChatMessage[] }>('GET', 'getmessages', { token, chatid, fromid }),
  postMessage: (token: string, message: NewMessage) => request('POST', 'postmessage', { token, ...message }),

  // Attachments (used directly as <img src> / <a href>)
  photoUrl: (photoid: string) => `${BASE_URL}/?request=getphoto&photoid=${encodeURIComponent(photoid)}`,
  fileUrl: (fileid: string) => `${BASE_URL}/?request=getfile&fileid=${encodeURIComponent(fileid)}`,
};
