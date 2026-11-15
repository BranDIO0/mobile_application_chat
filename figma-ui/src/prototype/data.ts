import type { ReactNode } from 'react'

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
  | 'notifications'

export type FileAtt = { name: string; size: string; kind: 'pdf' | 'img' }

export type Msg = {
  id: string
  from: string // 'self' or a user id
  dozent?: boolean
  time: string
  text?: string
  file?: FileAtt
}

export type Channel = {
  id: string
  name: string
  icon: string
  moduleId?: string
  members: number
  archived?: boolean
  messages: Msg[]
}

export type Module = {
  id: string
  short: string
  abbr: string
  full: string
  code: string
  prof: string
  participants: number
  category: string
  joined: boolean
}

export type Invitation = {
  id: string
  room: string
  icon: string
  from: string
  when: string
  status: 'open' | 'accepted' | 'rejected'
  moduleId?: string
  channelName: string
}

export type NotifTarget =
  | { type: 'invitations' }
  | { type: 'channel'; channelId: string }
  | { type: 'archive' }
  | { type: 'catalog' }

export type Notif = {
  id: string
  html: ReactNode
  time: string
  unread: boolean
  target: NotifTarget
}

export const CATEGORIES = ['Pflicht — 1. Semester', 'Pflicht — 2. Semester', 'Wahlpflicht']

export const initialModules: Module[] = [
  { id: 'mathe1', abbr: 'M1', short: 'Mathe 1', full: 'Mathematik 1', code: 'INFB101', prof: 'Prof. Müller', participants: 120, category: CATEGORIES[0], joined: true },
  { id: 'prog1', abbr: 'P1', short: 'Prog. 1', full: 'Programmierung 1', code: 'INFB102', prof: 'Prof. Schmidt', participants: 118, category: CATEGORIES[0], joined: true },
  { id: 'techgr', abbr: 'TG', short: 'Techn. Grundl.', full: 'Technische Grundlagen', code: 'INFB103', prof: 'Prof. Lang', participants: 95, category: CATEGORIES[0], joined: false },
  { id: 'db', abbr: 'DB', short: 'DB Systeme', full: 'Datenbanksysteme', code: 'INFB201', prof: 'Prof. Weber', participants: 88, category: CATEGORIES[1], joined: true },
  { id: 'algo', abbr: 'AD', short: 'Algo & DS', full: 'Algo. & Datenstrukturen', code: 'INFB202', prof: 'Prof. Klein', participants: 102, category: CATEGORIES[1], joined: false },
  { id: 'web', abbr: 'WE', short: 'Webentw.', full: 'Webentwicklung', code: 'INFB401', prof: 'Prof. Braun', participants: 45, category: CATEGORIES[2], joined: false },
]

let uid = 0
export const nextId = (p = 'id') => `${p}-${Date.now().toString(36)}-${uid++}`

export const TAFEL: FileAtt = { name: 'Tafelanschrieb_VL3.jpg', size: '1.2 MB', kind: 'img' }

export const initialChannels: Channel[] = [
  {
    id: 'mathe1-main',
    name: 'Hauptkanal',
    icon: '💬',
    moduleId: 'mathe1',
    members: 120,
    messages: [
      { id: 'm1', from: 'prof.mueller', dozent: true, time: '8:00', text: 'Willkommen zu Mathe 1 im WS 26/27! Folien und Übungsblätter findet ihr wie immer auf Moodle.' },
      { id: 'm2', from: 'abcdit44', time: '8:12', text: 'Gibt es diese Woche schon ein Tutorium?' },
      { id: 'm3', from: 'prof.mueller', dozent: true, time: '9:10', text: 'Klausurvorbereitung: Aufgabe 3b ist jetzt auf Moodle.' },
    ],
  },
  {
    id: 'lg-a',
    name: 'Lerngruppe A',
    icon: '💬',
    moduleId: 'mathe1',
    members: 5,
    messages: [
      { id: 'a1', from: 'abcdit44', time: '8:30', text: 'Haben wir Aufgabe 3 schon besprochen?' },
      { id: 'a2', from: 'abcdit09', time: '8:35', file: TAFEL },
      { id: 'a3', from: 'abcdit09', time: '8:36', text: 'Hab das Foto vom Hörsaal gemacht.' },
      { id: 'a4', from: 'self', time: '8:50', text: 'Super! Ich schreib meine Lösung gleich auf.' },
      { id: 'a5', from: 'self', time: '9:00', file: { name: 'Loesung_A3b.pdf', size: '210 KB', kind: 'pdf' } },
      { id: 'a6', from: 'abcdit23', time: '9:05', text: 'Danke! Bei Teilaufgabe b) noch unsicher 🤔' },
      { id: 'a7', from: 'prof.mueller', dozent: true, time: '9:10', text: 'Klausurvorbereitung: Aufgabe 3b ist jetzt auf Moodle.' },
      { id: 'a8', from: 'abcdit23', time: '9:15', text: 'Lösung zu Übungsblatt 5?' },
      { id: 'a9', from: 'self', time: '9:18', text: 'Habe meine Zusammenfassung hochgeladen 👇' },
      { id: 'a10', from: 'self', time: '9:18', file: { name: 'Zusammenfassung_Mathe1.pdf', size: '340 KB', kind: 'pdf' } },
    ],
  },
  {
    id: 'ueb3',
    name: 'Übungsblatt 3',
    icon: '💬',
    moduleId: 'mathe1',
    members: 4,
    messages: [
      { id: 'u1', from: 'abcdit09', time: 'Mo', text: 'Wer übernimmt Aufgabe 2?' },
      { id: 'u2', from: 'self', time: 'Mo', text: 'Ich mach die 2, wenn jemand die 4 nimmt.' },
      { id: 'u3', from: 'abcdit09', time: 'Mo', text: 'Deal 👍' },
    ],
  },
  {
    id: 'prog1-main',
    name: 'Hauptkanal',
    icon: '💬',
    moduleId: 'prog1',
    members: 118,
    messages: [
      { id: 'p1', from: 'prof.schmidt', dozent: true, time: '7:45', text: 'Abgabe Praktikum 2 bis Freitag 23:59 über GitLab.' },
      { id: 'p2', from: 'abcdit23', time: '8:02', text: 'Muss die Doku auch in Markdown sein?' },
      { id: 'p3', from: 'prof.schmidt', dozent: true, time: '8:20', text: 'Ja, README.md im Repo-Root reicht.' },
    ],
  },
  {
    id: 'db-main',
    name: 'Hauptkanal',
    icon: '💬',
    moduleId: 'db',
    members: 88,
    messages: [
      { id: 'd1', from: 'prof.weber', dozent: true, time: 'Di', text: 'Ab nächster Woche findet die Übung in Raum S 1.07 statt.' },
    ],
  },
  {
    id: 'webtech',
    name: 'Webtech-Proj.',
    icon: '🔧',
    members: 4,
    messages: [
      { id: 'w1', from: 'abcdit23', time: 'gestern', text: 'Repo ist angelegt, Einladungen sind raus.' },
      { id: 'w2', from: 'self', time: 'gestern', text: 'Top, ich kümmere mich ums Frontend.' },
    ],
  },
  {
    id: 'archiv-mathe1',
    name: 'Mathe 1 — Hauptkanal',
    icon: '📦',
    members: 134,
    archived: true,
    messages: [
      { id: 'x1', from: 'prof.mueller', dozent: true, time: '10:00', text: 'Klausurergebnisse sind im Sekretariat abholbar.' },
      { id: 'x2', from: 'abcdit44', time: '10:15', file: { name: 'Klausurvorbereitung_SS25.pdf', size: '580 KB', kind: 'pdf' } },
      { id: 'x3', from: 'abcdit23', time: '10:20', text: 'War eine gute Runde. Viel Erfolg allen! 🎉' },
    ],
  },
]

export const initialInvitations: Invitation[] = [
  { id: 'i1', room: 'Lerngruppe B — Mathe 1', icon: '💬', from: 'abcdit44', when: 'vor 2 Stunden', status: 'open', moduleId: 'mathe1', channelName: 'Lerngruppe B' },
  { id: 'i2', room: 'Webtech-Hackathon-Team', icon: '🔧', from: 'abcdit23', when: 'gestern', status: 'open', channelName: 'Webtech-Hackathon' },
  { id: 'i3', room: 'Übungsblatt 3 — Mathe 1', icon: '💬', from: 'abcdit09', when: '3 Tage her', status: 'accepted', channelName: 'Übungsblatt 3' },
  { id: 'i4', room: 'Gaming-Gruppe', icon: '🎮', from: 'abcdit77', when: '1 Woche her', status: 'rejected', channelName: 'Gaming-Gruppe' },
]

export const REPLIES = [
  'Danke, schau ich mir gleich an!',
  'Gute Idee 👍',
  'Bin dabei.',
  'Kannst du das nochmal erklären?',
  'Sehe ich genauso.',
  'Treffen wir uns morgen in der Bib?',
]

export const MEMBERS = ['abcdit44', 'abcdit09', 'abcdit23']

export function nowTime() {
  const d = new Date()
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}
