import { BASE_URL, request } from './client';
import { getMockFileUrl, getMockPhotoUrl, isMockModeEnabled } from './mockServer';
import type { ApiResponse, ChatInvite, ChatMessage, ChatRoom, NewMessage, UserProfile } from '../types';

/** One function per chat server command. See https://www2.hs-esslingen.de/~chkohl/chat/docs/ */
export const chatApi = {
  // Account
  register: (userid: string, password: string, nickname: string, fullname: string) =>
    request('GET', 'register', { userid, password, nickname, fullname }),
  login: (userid: string, password: string) => request('GET', 'login', { userid, password }),
  validateToken: (token: string) => request('GET', 'validatetoken', { token }),
  logout: (token: string) => request('GET', 'logout', { token }),
  deregister: (token: string) => request('GET', 'deregister', { token }),

  // Chats & users
  getChats: (token: string) => request<ApiResponse & { chats: ChatRoom[] }>('GET', 'getchats', { token }),
  createChat: (token: string, chatname: string, ispublic = true) =>
    request<ApiResponse & { chatid: number }>('GET', 'createchat', { token, chatname, ispublic }),
  joinChat: (token: string, chatid: number) => request('GET', 'joinchat', { token, chatid }),
  leaveChat: (token: string, chatid: number) => request('GET', 'leavechat', { token, chatid }),
  deleteChat: (token: string, chatid: number) => request('GET', 'deletechat', { token, chatid }),
  invite: (token: string, chatid: number, invitedhash: string) =>
    request('GET', 'invite', { token, chatid, invitedhash }),
  getInvites: (token: string) => request<ApiResponse & { invites: ChatInvite[] }>('GET', 'getinvites', { token }),
  rejectInvite: (token: string, chatid: number) => request('GET', 'rejectinvite', { token, chatid }),
  getProfiles: (token: string) =>
    request<ApiResponse & { profiles: UserProfile[] }>('GET', 'getprofiles', { token }),

  // Messages
  getMessages: (token: string, chatid: number, fromid = 0) =>
    request<ApiResponse & { messages: ChatMessage[] }>('GET', 'getmessages', { token, chatid, fromid }),
  postMessage: (token: string, message: NewMessage) => request('POST', 'postmessage', { token, ...message }),

  // Attachments (used directly as <img src> / <a href>)
  photoUrl: (photoid: string, token?: string) => {
    if (isMockModeEnabled() || photoid.startsWith('photo_')) {
      return getMockPhotoUrl(photoid);
    }
    return `${BASE_URL}/?request=getphoto&photoid=${encodeURIComponent(photoid)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },
  fileUrl: (fileid: string, token?: string) => {
    if (isMockModeEnabled() || fileid.startsWith('file_')) {
      return getMockFileUrl(fileid);
    }
    return `${BASE_URL}/?request=getfile&fileid=${encodeURIComponent(fileid)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },
};
