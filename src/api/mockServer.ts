import { ERROR_CODES, type ApiResponse, type ChatInvite, type ChatMessage, type ChatRoom, type UserProfile } from '../types';
import { ApiError } from './client';

const STORAGE_KEY = 'hse_chat_mock_db_v1';
const MODE_KEY = 'hse_chat_use_mock';

export function isMockModeEnabled(): boolean {
  return localStorage.getItem(MODE_KEY) === 'true';
}

export function setMockModeEnabled(enabled: boolean): void {
  if (enabled) localStorage.setItem(MODE_KEY, 'true');
  else localStorage.removeItem(MODE_KEY);
  window.dispatchEvent(new Event('hse-mock-mode-change'));
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
        userid: 'asesit01',
        password: 'password123',
        nickname: 'Asinas',
        fullname: 'Asinas Esber',
        hash: 'hash_asesit01_c3d4',
        token: 'mock_token_asesit01',
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
      { chatid: 0, chatname: 'Main Chat', visibility: 'public' },
      { chatid: 1, chatname: 'Mobile UI – Vorlesung', visibility: 'public' },
      { chatid: 2, chatname: 'Mobile UI – Übung Gruppe 5', visibility: 'public' },
      { chatid: 3, chatname: 'Projekt Alpha – Intern', visibility: 'private' },
    ],
    invites: [
      { chatid: 4, chatname: 'Klausurvorbereitung WS26', visibility: 'private' },
    ],
    messages: [
      {
        id: 1,
        chatid: 0,
        userid: 'cehiit02',
        usernick: 'Celine',
        time: '2026-10-30 10:15:00',
        important: false,
        text: 'Hallo zusammen! Willkommen im Hauptchat der Hochschule Esslingen.',
      },
      {
        id: 2,
        chatid: 0,
        userid: 'niplit03',
        usernick: 'Niklas',
        time: '2026-10-30 10:18:22',
        important: true,
        text: 'Wichtiger Hinweis: Heute werden getchats, getmessages sowie Lade- und Fehlerzustände vorgestellt.',
      },
      {
        id: 3,
        chatid: 1,
        userid: 'asesit01',
        usernick: 'Asinas',
        time: '2026-10-30 11:02:10',
        important: true,
        text: 'Die Folien zur API-Anbindung (getchats & getmessages) sind jetzt verfügbar.',
      },
      {
        id: 4,
        chatid: 2,
        userid: 'jaehit00',
        usernick: 'Jan',
        time: '2026-10-30 11:45:00',
        important: false,
        text: 'Ich habe das Frontend auf die erste Alpha-Version umgebaut.',
        position: '{lat: 48.739, lon: 9.307}',
      },
    ],
    photos: {},
    files: {},
    nextChatId: 5,
    nextMsgId: 5,
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
  return db.photos[photoid] ?? '';
}

export function getMockFileUrl(fileid: string): string {
  const db = loadDb();
  return db.files[fileid] ?? '#';
}

export async function handleMockRequest<T = ApiResponse>(
  name: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  // Simulate realistic network latency for loading states
  await delay(name === 'validatetoken' ? 950 : 250);

  const db = loadDb();

  const requireToken = (): MockUser => {
    const token = String(params.token ?? '');
    if (!token || token === 'invalid-token') {
      throwError(456);
    }
    let user = db.users.find((u) => u.token === token);
    if (!user) {
      // If user had a token from an earlier session, bind it to current userId
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
        // Auto-create in mock mode if valid format so testing is effortless
        user = {
          userid,
          password,
          nickname: userid.slice(0, 4),
          fullname: `${userid} (Student)`,
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
