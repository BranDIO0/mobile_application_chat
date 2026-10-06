/** Common shape of every JSON response of the chat server. */
export interface ApiResponse {
  status: 'ok' | 'error';
  code: number;
  message: string;
  token?: string;
  hash?: string;
}

export interface ChatMessage {
  id: number;
  userid: string;
  time: string;
  chatid: number;
  important: boolean;
  text: string;
  photoid?: string | null;
  fileid?: string | null;
  position?: string | null;
  usernick?: string;
}

/** Payload for `postmessage` (everything optional). */
export interface NewMessage {
  text?: string;
  chatid?: number;
  photo?: string;
  file?: string;
  position?: string;
  important?: boolean;
}

export interface ChatRoom {
  chatid: number;
  chatname: string;
  visibility: 'public' | 'private';
}

export interface UserProfile {
  userid: string;
  fullname: string;
  nickname: string;
  hash: string;
}

/** Meaning of the application error codes (returned as HTTP status). */
export const ERROR_CODES: Record<number, string> = {
  451: 'Wrong user id format (4 letters + "it" + 2 digits, e.g. jaehit00)',
  452: 'User already exists – use login instead',
  453: 'Password too short (min. 6 characters)',
  454: 'Unknown user',
  455: 'Wrong password',
  456: 'Invalid token',
  457: 'Invalid photo / file id',
  458: 'Invalid chat id',
  462: 'Chat name too short (min. 2 characters)',
  466: 'Nickname too short (min. 2 characters)',
  467: 'Nickname too long (max. 30 characters)',
  468: 'Full name too short (min. 2 characters)',
  469: 'Full name too long (max. 30 characters)',
};
