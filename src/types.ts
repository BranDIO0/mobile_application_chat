export interface ApiResponse {
  status: 'ok' | 'error';
  code: number;
  message: string;
  token?: string;
  hash?: string;
  [key: string]: any;
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
  userhash?: string;
  userfullname?: string;
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

export const ERROR_CODES: Record<number, string> = {
  451: 'User-ID Format falsch (Muss 4 Buchstaben + it + 2 Ziffern sein, z.B. jaehit00)',
  452: 'User existiert bereits -> Führe Login durch',
  453: 'Passwort zu kurz (mindestens 6 Zeichen)',
  454: 'Unbekannter User beim Login',
  455: 'Falsches Passwort',
  456: 'Token ungültig oder abgelaufen',
  457: 'Ungültige Foto-/Datei-ID',
  458: 'Ungültige Chat-ID',
  462: 'Chat-Name zu kurz (mind. 2 Zeichen)',
  466: 'Nickname zu kurz (mind. 2 Zeichen)',
  467: 'Nickname zu lang (max. 30 Zeichen)',
  468: 'Fullname zu kurz (mind. 2 Zeichen)',
  469: 'Fullname zu lang (max. 30 Zeichen)',
};
