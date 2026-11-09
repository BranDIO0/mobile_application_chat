import type { ReactNode } from 'react';

export type ScreenId =
  | 'splash'
  | 'login'
  | 'register'
  | 'onboarding'
  | 'chats'
  | 'chat'
  | 'archive'
  | 'catalog'
  | 'freegroup'
  | 'invite'
  | 'invitations'
  | 'file'
  | 'profile'
  | 'settings'
  | 'notifications';

export type FileAtt = {
  name: string;
  size: string;
  kind: 'pdf' | 'img';
  url?: string;
};

export type Msg = {
  id: string;
  from: string; // 'self' or a user id / nickname
  senderId?: string;
  dozent?: boolean;
  time: string;
  text?: string;
  file?: FileAtt;
  important?: boolean;
};

export type Channel = {
  id: string;
  chatid: number;
  rawName: string;
  name: string;
  icon: string;
  moduleId?: string;
  members: number;
  archived?: boolean;
  visibility?: 'public' | 'private';
  messages: Msg[];
};

export type Module = {
  id: string;
  short: string;
  abbr: string;
  full: string;
  code: string;
  prof: string;
  participants: number;
  category: string;
  joined: boolean;
  slug: string;
};

export type Invitation = {
  id: string;
  chatid: number;
  room: string;
  icon: string;
  from: string;
  when: string;
  status: 'open' | 'accepted' | 'rejected';
  moduleId?: string;
  channelName: string;
};

export type NotifTarget =
  | { type: 'invitations' }
  | { type: 'channel'; channelId: string }
  | { type: 'archive' }
  | { type: 'catalog' };

export type Notif = {
  id: string;
  html: ReactNode;
  time: string;
  unread: boolean;
  target: NotifTarget;
};

export const CATEGORIES = ['Pflicht — 1. Semester', 'Pflicht — 2. Semester', 'Wahlpflicht'];

export const INITIAL_MODULES: Module[] = [
  { id: 'mathe1', slug: 'Mathe_1', abbr: 'M1', short: 'Mathe 1', full: 'Mathematik 1', code: 'INFB101', prof: 'Prof. Müller', participants: 120, category: CATEGORIES[0], joined: true },
  { id: 'prog1', slug: 'Prog_1', abbr: 'P1', short: 'Prog. 1', full: 'Programmierung 1', code: 'INFB102', prof: 'Prof. Schmidt', participants: 118, category: CATEGORIES[0], joined: true },
  { id: 'techgr', slug: 'Techn_Grundl', abbr: 'TG', short: 'Techn. Grundl.', full: 'Technische Grundlagen', code: 'INFB103', prof: 'Prof. Lang', participants: 95, category: CATEGORIES[0], joined: false },
  { id: 'db', slug: 'DB_Systeme', abbr: 'DB', short: 'DB Systeme', full: 'Datenbanksysteme', code: 'INFB201', prof: 'Prof. Weber', participants: 88, category: CATEGORIES[1], joined: true },
  { id: 'algo', slug: 'Algo_DS', abbr: 'AD', short: 'Algo & DS', full: 'Algo. & Datenstrukturen', code: 'INFB202', prof: 'Prof. Klein', participants: 102, category: CATEGORIES[1], joined: false },
  { id: 'web', slug: 'Webentw', abbr: 'WE', short: 'Webentw.', full: 'Webentwicklung', code: 'INFB401', prof: 'Prof. Braun', participants: 45, category: CATEGORIES[2], joined: false },
];

export const TAFEL: FileAtt = { name: 'Tafelanschrieb_VL3.jpg', size: '1.2 MB', kind: 'img' };

export const DOZENT_USERS = ['prof.mueller', 'prof.schmidt', 'prof.weber', 'prof.lang', 'prof.klein', 'prof.braun'];

export function isDozentUser(userid?: string, nick?: string): boolean {
  const u = (userid ?? '').toLowerCase();
  const n = (nick ?? '').toLowerCase();
  return (
    DOZENT_USERS.includes(u) ||
    u.startsWith('prof') ||
    n.startsWith('prof') ||
    n.includes('dozent')
  );
}

export function slugifyName(s: string): string {
  return s.trim().replace(/[.\s]+/g, '_').replace(/_+$/, '');
}

export function unslugifyName(s: string): string {
  return s.replace(/_/g, ' ').trim();
}
