import { ERROR_CODES, type ApiResponse, type ChatInvite, type ChatMessage, type ChatRoom, type UserProfile } from '../types';
import { ApiError } from './client';

const STORAGE_KEY = 'hse_chat_mock_db_v2';
const MODE_KEY = 'hse_chat_use_mock';
const SERVER_MODE_KEY = 'hse_chat_server_mode';

export type ServerMode = 'live' | 'backup' | 'mock';

export function getServerMode(): ServerMode {
  const saved = localStorage.getItem(SERVER_MODE_KEY);
  if (saved === 'live' || saved === 'backup' || saved === 'mock') {
    return saved;
  }
  const legacyMock = localStorage.getItem(MODE_KEY);
  if (legacyMock === 'true') return 'mock';
  return 'live';
}

export function setServerModeStore(mode: ServerMode): void {
  localStorage.setItem(SERVER_MODE_KEY, mode);
  localStorage.setItem(MODE_KEY, mode === 'mock' ? 'true' : 'false');
  window.dispatchEvent(new Event('hse-mock-mode-change'));
}

export function isMockModeEnabled(): boolean {
  return getServerMode() === 'mock';
}

export function setMockModeEnabled(enabled: boolean): void {
  setServerModeStore(enabled ? 'mock' : 'live');
}

interface MockUser {
  userid: string;
  password: string;
  nickname: string;
  fullname: string;
  hash: string;
  token: string;
}

interface MockDb {
  users: MockUser[];
  rooms: ChatRoom[];
  invites: ChatInvite[];
  messages: ChatMessage[];
  photos: Record<string, string>;
  files: Record<string, string>;
  nextChatId: number;
  nextMsgId: number;
}

function createInitialDb(): MockDb {
  return {
    users: [
      {
        userid: 'jaehit00',
        password: 'password123',
        nickname: 'Jan',
        fullname: 'Jan Ehrler',
        hash: 'hash_jaehit00_a1b2',
        token: 'mock_token_jaehit00',
      },
      {
        userid: 'asesit00',
        password: 'password123',
        nickname: 'Asinas',
        fullname: 'Asinas Esber',
        hash: 'hash_asesit00_c3d4',
        token: 'mock_token_asesit00',
      },
      {
        userid: 'abcdit01',
        password: 'password123',
        nickname: 'Max',
        fullname: 'Max Mustermann',
        hash: 'hash_abcdit01_m1m2',
        token: 'mock_token_abcdit01',
      },
      {
        userid: 'abcdit09',
        password: 'password123',
        nickname: 'abcdit09',
        fullname: 'Anna Beispiel',
        hash: 'hash_abcdit09_a9b9',
        token: 'mock_token_abcdit09',
      },
      {
        userid: 'abcdit23',
        password: 'password123',
        nickname: 'abcdit23',
        fullname: 'Lukas Weber',
        hash: 'hash_abcdit23_l2w3',
        token: 'mock_token_abcdit23',
      },
      {
        userid: 'abcdit44',
        password: 'password123',
        nickname: 'abcdit44',
        fullname: 'Sarah Klein',
        hash: 'hash_abcdit44_s4k4',
        token: 'mock_token_abcdit44',
      },
      {
        userid: 'cehiit02',
        password: 'password123',
        nickname: 'Celine',
        fullname: 'Celine Hidiroglu',
        hash: 'hash_cehiit02_e5f6',
        token: 'mock_token_cehiit02',
      },
      {
        userid: 'niplit03',
        password: 'password123',
        nickname: 'Niklas',
        fullname: 'Niklas Plecevic',
        hash: 'hash_niplit03_g7h8',
        token: 'mock_token_niplit03',
      },
    ],
    rooms: [
      { chatid: 1, chatname: 'WS26:MOD:Mathe_1:MAIN', visibility: 'public' },
      { chatid: 2, chatname: 'WS26:MOD:Mathe_1:SUB:Lerngruppe_A', visibility: 'private' },
      { chatid: 3, chatname: 'WS26:MOD:Mathe_1:SUB:Übungsblatt_3', visibility: 'private' },
      { chatid: 4, chatname: 'WS26:MOD:Prog_1:MAIN', visibility: 'public' },
      { chatid: 5, chatname: 'WS26:MOD:DB_Systeme:MAIN', visibility: 'public' },
      { chatid: 6, chatname: 'CUSTOM:Webtech-Proj.', visibility: 'private' },
      { chatid: 7, chatname: 'SS25:MOD:Mathe_1:MAIN', visibility: 'public' },
    ],
    invites: [
      { chatid: 8, chatname: 'WS26:MOD:Mathe_1:SUB:Lerngruppe_B', userid: 'abcdit44', usernick: 'abcdit44', visibility: 'private' },
      { chatid: 9, chatname: 'CUSTOM:Webtech-Hackathon-Team', userid: 'abcdit23', usernick: 'abcdit23', visibility: 'private' },
    ],
    messages: [
      {
        id: 1,
        chatid: 1,
        userid: 'prof.mueller',
        usernick: 'prof.mueller',
        time: '2026-11-09 08:00:00',
        important: true,
        text: 'Willkommen zu Mathe 1 im WS 26/27! Folien und Übungsblätter findet ihr wie immer auf Moodle.',
      },
      {
        id: 2,
        chatid: 1,
        userid: 'abcdit44',
        usernick: 'abcdit44',
        time: '2026-11-09 08:12:00',
        important: false,
        text: 'Gibt es diese Woche schon ein Tutorium?',
      },
      {
        id: 3,
        chatid: 1,
        userid: 'prof.mueller',
        usernick: 'prof.mueller',
        time: '2026-11-09 09:10:00',
        important: true,
        text: 'Klausurvorbereitung: Aufgabe 3b ist jetzt auf Moodle.',
      },
      {
        id: 4,
        chatid: 2,
        userid: 'abcdit44',
        usernick: 'abcdit44',
        time: '2026-11-09 08:30:00',
        important: false,
        text: 'Haben wir Aufgabe 3 schon besprochen?',
      },
      {
        id: 5,
        chatid: 2,
        userid: 'abcdit09',
        usernick: 'abcdit09',
        time: '2026-11-09 08:35:00',
        important: false,
        text: '[ATTACHMENT::Tafelanschrieb_VL3.jpg::1.2 MB::img]',
        photoid: 'photo_tafel',
      },
      {
        id: 6,
        chatid: 2,
        userid: 'abcdit09',
        usernick: 'abcdit09',
        time: '2026-11-09 08:36:00',
        important: false,
        text: 'Hab das Foto vom Hörsaal gemacht.',
      },
      {
        id: 7,
        chatid: 2,
        userid: 'abcdit23',
        usernick: 'abcdit23',
        time: '2026-11-09 09:05:00',
        important: false,
        text: 'Danke! Bei Teilaufgabe b) noch unsicher 🤔',
      },
      {
        id: 8,
        chatid: 2,
        userid: 'prof.mueller',
        usernick: 'prof.mueller',
        time: '2026-11-09 09:10:00',
        important: true,
        text: 'Klausurvorbereitung: Aufgabe 3b ist jetzt auf Moodle.',
      },
      {
        id: 9,
        chatid: 3,
        userid: 'abcdit09',
        usernick: 'abcdit09',
        time: '2026-11-08 14:15:00',
        important: false,
        text: 'Wer übernimmt Aufgabe 2?',
      },
      {
        id: 10,
        chatid: 4,
        userid: 'prof.schmidt',
        usernick: 'prof.schmidt',
        time: '2026-11-09 07:45:00',
        important: true,
        text: 'Abgabe Praktikum 2 bis Freitag 23:59 über GitLab.',
      },
      {
        id: 11,
        chatid: 4,
        userid: 'abcdit23',
        usernick: 'abcdit23',
        time: '2026-11-09 08:02:00',
        important: false,
        text: 'Muss die Doku auch in Markdown sein?',
      },
      {
        id: 12,
        chatid: 4,
        userid: 'prof.schmidt',
        usernick: 'prof.schmidt',
        time: '2026-11-09 08:20:00',
        important: true,
        text: 'Ja, README.md im Repo-Root reicht.',
      },
      {
        id: 13,
        chatid: 5,
        userid: 'prof.weber',
        usernick: 'prof.weber',
        time: '2026-11-07 10:00:00',
        important: true,
        text: 'Ab nächster Woche findet die Übung in Raum S 1.07 statt.',
      },
      {
        id: 14,
        chatid: 6,
        userid: 'abcdit23',
        usernick: 'abcdit23',
        time: '2026-11-08 18:30:00',
        important: false,
        text: 'Repo ist angelegt, Einladungen sind raus.',
      },
      {
        id: 15,
        chatid: 7,
        userid: 'prof.mueller',
        usernick: 'prof.mueller',
        time: '2025-07-14 10:00:00',
        important: true,
        text: 'Klausurergebnisse sind im Sekretariat abholbar.',
      },
      {
        id: 16,
        chatid: 7,
        userid: 'abcdit44',
        usernick: 'abcdit44',
        time: '2025-07-14 10:15:00',
        important: false,
        text: '[ATTACHMENT::Klausurvorbereitung_SS25.pdf::580 KB::pdf]',
        fileid: 'file_ss25',
      },
      {
        id: 17,
        chatid: 7,
        userid: 'abcdit23',
        usernick: 'abcdit23',
        time: '2025-07-14 10:20:00',
        important: false,
        text: 'War eine gute Runde. Viel Erfolg allen! 🎉',
      },
    ],
    photos: {},
    files: {},
    nextChatId: 10,
    nextMsgId: 18,
  };
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const init = createInitialDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw) as MockDb;
  } catch {
    return createInitialDb();
  }
}

function saveDb(db: MockDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

export function resetMockDb(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function throwError(code: number, customMsg?: string): never {
  const message = customMsg ?? ERROR_CODES[code] ?? `Error ${code}`;
  throw new ApiError(code, { status: 'error', code, message });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER_ID_REGEX = /^[a-zA-Z]{4}it\d{2}$/;

export function getMockPhotoUrl(photoid: string): string {
  const db = loadDb();
  return db.photos[photoid] ?? '/assets/hey-logo.png';
}

export function getMockFileUrl(fileid: string): string {
  const db = loadDb();
  return db.files[fileid] ?? '#';
}

export async function handleMockRequest<T = ApiResponse>(
  name: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  await delay(name === 'validatetoken' ? 500 : 150);

  const db = loadDb();

  const requireToken = (): MockUser => {
    const token = String(params.token ?? '');
    if (!token || token === 'invalid-token') {
      throwError(456);
    }
    let user = db.users.find((u) => u.token === token);
    if (!user) {
      const fallbackId = localStorage.getItem('userId') ?? 'jaehit00';
      user = db.users.find((u) => u.userid.toLowerCase() === fallbackId.toLowerCase());
      if (user) {
        user.token = token;
        saveDb(db);
      } else {
        throwError(456);
      }
    }
    return user;
  };

  switch (name) {
    case 'ping':
      return { status: 'ok', code: 200, message: 'Pong (Mock Server)' } as T;

    case 'register': {
      const userid = String(params.userid ?? '').trim();
      const password = String(params.password ?? '');
      const nickname = String(params.nickname ?? '').trim();
      const fullname = String(params.fullname ?? '').trim();

      if (!USER_ID_REGEX.test(userid)) throwError(451);
      if (db.users.some((u) => u.userid.toLowerCase() === userid.toLowerCase())) throwError(452);
      if (password.length < 6) throwError(453);
      if (nickname.length < 2) throwError(466);
      if (nickname.length > 30) throwError(467);
      if (fullname.length < 2) throwError(468);
      if (fullname.length > 30) throwError(469);

      const token = `mock_tok_${userid}_${Date.now().toString(36)}`;
      const hash = `hash_${userid}_${Math.random().toString(36).slice(2, 6)}`;
      db.users.push({ userid, password, nickname, fullname, hash, token });
      saveDb(db);

      return { status: 'ok', code: 200, message: 'User registered', token, hash } as T;
    }

    case 'login': {
      const userid = String(params.userid ?? '').trim();
      const password = String(params.password ?? '');

      if (!USER_ID_REGEX.test(userid)) throwError(451);
      if (userid.toLowerCase() === 'zzzzit99') throwError(454);
      if (password === 'definitely-wrong') throwError(455);
      if (password.length < 6) throwError(453);

      let user = db.users.find((u) => u.userid.toLowerCase() === userid.toLowerCase());
      if (!user) {
        user = {
          userid,
          password,
          nickname: userid,
          fullname: `${userid} (Studierender)`,
          hash: `hash_${userid}`,
          token: `mock_tok_${userid}_${Date.now().toString(36)}`,
        };
        db.users.push(user);
      } else {
        user.token = `mock_tok_${userid}_${Date.now().toString(36)}`;
      }
      saveDb(db);

      return { status: 'ok', code: 200, message: 'Login successful', token: user.token, hash: user.hash } as T;
    }

    case 'validatetoken': {
      requireToken();
      return { status: 'ok', code: 200, message: 'Token valid' } as T;
    }

    case 'logout': {
      requireToken();
      return { status: 'ok', code: 200, message: 'Logged out' } as T;
    }

    case 'deregister': {
      const user = requireToken();
      db.users = db.users.filter((u) => u.userid !== user.userid);
      saveDb(db);
      return { status: 'ok', code: 200, message: 'User deregistered' } as T;
    }

    case 'getchats': {
      requireToken();
      return { status: 'ok', code: 200, message: 'Chats loaded', chats: db.rooms } as unknown as T;
    }

    case 'createchat': {
      requireToken();
      const chatname = String(params.chatname ?? '').trim();
      const ispublic = params.ispublic !== false && params.ispublic !== 'false';
      if (chatname.length < 2) throwError(462);
      if (chatname.length > 30) throwError(463);

      const chatid = db.nextChatId++;
      db.rooms.push({
        chatid,
        chatname,
        visibility: ispublic ? 'public' : 'private',
      });
      saveDb(db);
      return { status: 'ok', code: 200, message: 'Chat created', chatid } as unknown as T;
    }

    case 'joinchat': {
      requireToken();
      const chatid = Number(params.chatid);
      const inviteIdx = db.invites.findIndex((i) => i.chatid === chatid);
      if (inviteIdx !== -1) {
        const inv = db.invites[inviteIdx];
        db.invites.splice(inviteIdx, 1);
        if (!db.rooms.some((r) => r.chatid === chatid)) {
          db.rooms.push({
            chatid: inv.chatid,
            chatname: inv.chatname,
            visibility: inv.visibility ?? 'private',
          });
        }
        saveDb(db);
        return { status: 'ok', code: 200, message: 'Joined chat' } as T;
      }

      const existing = db.rooms.find((r) => r.chatid === chatid);
      if (!existing) {
        db.rooms.push({
          chatid,
          chatname: `Raum #${chatid}`,
          visibility: 'public',
        });
        saveDb(db);
      }
      return { status: 'ok', code: 200, message: 'Joined chat' } as T;
    }

    case 'leavechat': {
      requireToken();
      const chatid = Number(params.chatid);
      if (chatid === 0) throwError(461);
      db.rooms = db.rooms.filter((r) => r.chatid !== chatid);
      saveDb(db);
      return { status: 'ok', code: 200, message: 'Left chat' } as T;
    }

    case 'deletechat': {
      requireToken();
      const chatid = Number(params.chatid);
      if (chatid === 0) throwError(461);
      db.rooms = db.rooms.filter((r) => r.chatid !== chatid);
      db.messages = db.messages.filter((m) => m.chatid !== chatid);
      saveDb(db);
      return { status: 'ok', code: 200, message: 'Deleted chat' } as T;
    }

    case 'getinvites': {
      requireToken();
      return { status: 'ok', code: 200, message: 'Invites loaded', invites: db.invites } as unknown as T;
    }

    case 'rejectinvite': {
      requireToken();
      const chatid = Number(params.chatid);
      db.invites = db.invites.filter((i) => i.chatid !== chatid);
      saveDb(db);
      return { status: 'ok', code: 200, message: 'Invite rejected' } as T;
    }

    case 'invite': {
      requireToken();
      const invitedhash = String(params.invitedhash ?? '');
      if (!db.users.some((u) => u.hash === invitedhash)) throwError(464);
      return { status: 'ok', code: 200, message: 'User invited' } as T;
    }

    case 'getprofiles': {
      requireToken();
      const profiles: UserProfile[] = db.users.map(({ userid, fullname, nickname, hash }) => ({
        userid,
        fullname,
        nickname,
        hash,
      }));
      return { status: 'ok', code: 200, message: 'Profiles loaded', profiles } as unknown as T;
    }

    case 'getmessages': {
      requireToken();
      const chatid = Number(params.chatid ?? 0);
      const fromid = Number(params.fromid ?? 0);
      if (chatid !== 0 && !db.rooms.some((r) => r.chatid === chatid)) {
        throwError(458);
      }
      const messages = db.messages.filter((m) => m.chatid === chatid && m.id > fromid);
      return { status: 'ok', code: 200, message: 'Messages loaded', messages } as unknown as T;
    }

    case 'postmessage': {
      const user = requireToken();
      const chatid = Number(params.chatid ?? 0);
      if (chatid !== 0 && !db.rooms.some((r) => r.chatid === chatid)) {
        throwError(458);
      }

      const id = db.nextMsgId++;
      let photoid: string | null = null;
      let fileid: string | null = null;

      if (typeof params.photo === 'string' && params.photo) {
        photoid = `photo_${id}`;
        db.photos[photoid] = params.photo;
      }
      if (typeof params.file === 'string' && params.file) {
        fileid = `file_${id}`;
        db.files[fileid] = params.file;
      }

      const now = new Date();
      const time = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

      const msg: ChatMessage = {
        id,
        chatid,
        userid: user.userid,
        usernick: user.nickname,
        userfullname: user.fullname,
        time,
        important: Boolean(params.important),
        text: String(params.text ?? ''),
        photoid,
        fileid,
        position: typeof params.position === 'string' ? params.position : null,
      };
      db.messages.push(msg);
      saveDb(db);

      return { status: 'ok', code: 200, message: 'Message posted' } as T;
    }

    default:
      throwError(400, `Unbekannter Befehl: ${name}`);
  }
}
