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
  userhash?: string;
  userfullname?: string;
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
  role?: string;
}

export interface ChatInvite {
  chatid: number;
  chatname: string;
  userid?: string;
  usernick?: string;
  visibility?: 'public' | 'private';
}

export interface UserProfile {
  userid: string;
  fullname: string;
  nickname: string;
  hash: string;
}

/** Meaning of the application error codes (returned as HTTP status). */
export const ERROR_CODES: Record<number, string> = {
  451: 'Ungültiges User-ID-Format (4 Buchstaben + "it" + 2 Ziffern, z. B. jaehit00)',
  452: 'Nutzer existiert bereits – bitte Login verwenden',
  453: 'Passwort zu kurz (mind. 6 Zeichen)',
  454: 'Unbekannter Nutzer',
  455: 'Falsches Passwort',
  456: 'Token ungültig oder Sitzung abgelaufen – bitte neu anmelden',
  457: 'Ungültige Foto- oder Datei-ID',
  458: 'Ungültige Chat-ID (Raum existiert nicht)',
  459: 'Keine Berechtigung für diesen Chatraum',
  460: 'Bereits Mitglied in diesem Chatraum',
  461: 'Aktion für diesen Chatraum nicht erlaubt',
  462: 'Chatname zu kurz (mind. 2 Zeichen)',
  463: 'Chatname zu lang (max. 30 Zeichen)',
  464: 'Ungültiger User-Hash',
  465: 'Nutzer wurde bereits eingeladen',
  466: 'Nickname zu kurz (mind. 2 Zeichen)',
  467: 'Nickname zu lang (max. 30 Zeichen)',
  468: 'Vollständiger Name zu kurz (mind. 2 Zeichen)',
  469: 'Vollständiger Name zu lang (max. 30 Zeichen)',
};
