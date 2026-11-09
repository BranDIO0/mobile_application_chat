import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  initialChannels,
  initialInvitations,
  initialModules,
  MEMBERS,
  nextId,
  nowTime,
  REPLIES,
  TAFEL,
  type Channel,
  type FileAtt,
  type Invitation,
  type Module,
  type Notif,
  type NotifTarget,
  type ScreenId,
} from './data'

export type Dir = 'push' | 'pop' | 'fade'
export type Member = { id: string; role: string }
type InviteState = { pending: string[]; members: Member[] }
type OpenFile = { file: FileAtt; sharedBy: string; channelId: string }

const initialNotifs: Notif[] = [
  { id: 'n1', unread: true, time: 'vor 2 Stunden', target: { type: 'invitations' }, html: <><strong>abcdit44</strong> hat dich zur <strong>Lerngruppe B</strong> eingeladen.</> },
  { id: 'n2', unread: true, time: 'vor 3 Stunden', target: { type: 'channel', channelId: 'mathe1-main' }, html: <><strong>[Dozent]</strong> prof.mueller hat eine neue Nachricht in <strong>Mathe 1</strong> gepostet.</> },
  { id: 'n3', unread: true, time: 'vor 4 Stunden', target: { type: 'channel', channelId: 'lg-a' }, html: <><strong>abcdit23</strong> hat eine Datei in <strong>Lerngruppe A</strong> geteilt.</> },
  { id: 'n4', unread: false, time: 'gestern', target: { type: 'channel', channelId: 'prog1-main' }, html: <>Du bist <strong>Programmierung 1</strong> beigetreten.</> },
  { id: 'n5', unread: false, time: 'vor 2 Tagen', target: { type: 'channel', channelId: 'ueb3' }, html: <><strong>abcdit09</strong> hat deine Einladung zu <strong>Übungsblatt 3</strong> angenommen.</> },
  { id: 'n6', unread: false, time: 'vor 1 Monat', target: { type: 'archive' }, html: <>Kurs <strong>Mathe 1 (SS25)</strong> wurde archiviert. Nur-Lese-Modus aktiv.</> },
]

/** Jump targets for the screen-nav chips (matches the numbered mockups). */
export const JUMPS: { id: string; num: string; label: string; section: string }[] = [
  { id: 's01', num: '01', label: 'Splash', section: 'Authentifizierung' },
  { id: 's02', num: '02', label: 'Login', section: 'Authentifizierung' },
  { id: 's03', num: '03', label: 'Registrierung', section: 'Authentifizierung' },
  { id: 's04', num: '04', label: 'Onboarding', section: 'Authentifizierung' },
  { id: 's05', num: '05', label: 'Chats', section: 'Hauptanwendung' },
  { id: 's06', num: '06', label: 'Chat-Ansicht', section: 'Hauptanwendung' },
  { id: 's07', num: '07', label: 'Archiv', section: 'Hauptanwendung' },
  { id: 's08', num: '08', label: 'Modulkatalog', section: 'Kursfindung & Gruppen' },
  { id: 's09', num: '09', label: 'Untergruppe erstellen', section: 'Kursfindung & Gruppen' },
  { id: 's10', num: '10', label: 'Freie Gruppe', section: 'Kursfindung & Gruppen' },
  { id: 's11', num: '11', label: 'Einladen', section: 'Einladungen & Mitglieder' },
  { id: 's12', num: '12', label: 'Einladungen', section: 'Einladungen & Mitglieder' },
  { id: 's13', num: '13', label: 'Datei-Ansicht', section: 'Einladungen & Mitglieder' },
  { id: 's14', num: '14', label: 'Profil', section: 'Konto & Einstellungen' },
  { id: 's15', num: '15', label: 'Einstellungen', section: 'Konto & Einstellungen' },
  { id: 's16', num: '16', label: 'Benachrichtigungen', section: 'Konto & Einstellungen' },
]

const SCREEN_TO_JUMP: Record<ScreenId, string> = {
  splash: 's01', login: 's02', register: 's03', onboarding: 's04', chats: 's05', chat: 's06',
  archive: 's07', catalog: 's08', freegroup: 's10', invite: 's11', invitations: 's12',
  file: 's13', profile: 's14', settings: 's15', notifications: 's16',
}

function useProtoState() {
  const [stack, setStack] = useState<ScreenId[]>(['splash'])
  const [dir, setDir] = useState<Dir>('fade')
  const [navKey, setNavKey] = useState(0)
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null)

  const [userId, setUserId] = useState('abcdit01')
  const [displayName, setDisplayName] = useState('Max Mustermann')
  const [remember, setRemember] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [obDone, setObDone] = useState<number[]>([])

  const [modules, setModules] = useState<Module[]>(initialModules)
  const [channels, setChannels] = useState<Channel[]>(initialChannels)
  const [activeChannelId, setActiveChannelId] = useState('lg-a')
  const [typing, setTyping] = useState<string | null>(null)
  const [openFileState, setOpenFile] = useState<OpenFile>({ file: TAFEL, sharedBy: 'abcdit09', channelId: 'lg-a' })
  const [subgroupModal, setSubgroupModal] = useState<string | null>(null)
  const [inviteMap, setInviteMap] = useState<Record<string, InviteState>>({})
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [notifs, setNotifs] = useState<Notif[]>(initialNotifs)
  const [settings, setSettings] = useState({ push: true, mentionsOnly: false, showArchived: true })
  const [collapsed, setCollapsed] = useState<string[]>([])
  const toggleCollapsed = (id: string) => setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const screen = stack[stack.length - 1]
  const bump = (d: Dir) => {
    setDir(d)
    setNavKey((k) => k + 1)
  }

  const navigate = useCallback((id: ScreenId) => {
    setStack((s) => [...s, id])
    bump('push')
  }, [])
  const replace = (id: ScreenId) => {
    setStack((s) => [...s.slice(0, -1), id])
    bump('push')
  }
  const reset = (ids: ScreenId | ScreenId[], d: Dir = 'fade') => {
    setStack(Array.isArray(ids) ? ids : [ids])
    setSubgroupModal(null)
    bump(d)
  }
  const back = () => {
    setSubgroupModal(null)
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : ['chats']))
    bump('pop')
  }
  const tab = (id: ScreenId) => {
    if (id === 'chats') setOnboarded(true)
    reset(id)
  }

  const toast = (text: string) => {
    const id = Date.now()
    setToastMsg({ id, text })
    later(() => setToastMsg((t) => (t?.id === id ? null : t)), 2200)
  }

  const channel = (id: string) => channels.find((c) => c.id === id)
  const moduleOf = (c?: Channel) => modules.find((m) => m.id === c?.moduleId)
  const activeChannel = channel(activeChannelId) ?? channels[0]

  const markOb = (n: number) => setObDone((d) => (d.includes(n) ? d : [...d, n]))

  // ── Auth ──
  const login = (id: string, keep: boolean) => {
    if (id.trim()) setUserId(id.trim())
    setRemember(keep)
    setHasSession(keep)
    reset(onboarded ? 'chats' : 'onboarding', 'push')
  }
  const register = (id: string, name: string) => {
    if (id.trim()) setUserId(id.trim())
    if (name.trim()) setDisplayName(name.trim())
    setOnboarded(false)
    setObDone([])
    setHasSession(true)
    reset('onboarding', 'push')
  }
  const logout = () => {
    setHasSession(false)
    reset('login', 'pop')
    toast('Abgemeldet')
  }
  const finishSplash = () => reset(hasSession && remember ? (onboarded ? 'chats' : 'onboarding') : 'login')

  // ── Chat ──
  const appendMsg = (chId: string, msg: Channel['messages'][number]) =>
    setChannels((cs) => cs.map((c) => (c.id === chId ? { ...c, messages: [...c.messages, msg] } : c)))

  const simulateReply = (chId: string) => {
    later(() => setTyping(chId), 700)
    later(() => {
      setTyping((t) => (t === chId ? null : t))
      appendMsg(chId, {
        id: nextId('r'),
        from: MEMBERS[Math.floor(Math.random() * MEMBERS.length)],
        time: nowTime(),
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
      })
    }, 2200)
  }
  const sendMessage = (chId: string, text: string) => {
    appendMsg(chId, { id: nextId('s'), from: 'self', time: nowTime(), text })
    simulateReply(chId)
  }
  const attachFile = (chId: string) => {
    const n = channel(chId)?.messages.filter((m) => m.file && m.from === 'self').length ?? 0
    appendMsg(chId, { id: nextId('f'), from: 'self', time: nowTime(), file: { name: `Notizen_${n + 1}.pdf`, size: `${120 + n * 37} KB`, kind: 'pdf' } })
    toast('Datei hochgeladen')
  }
  const openChannel = (chId: string, push = true) => {
    setActiveChannelId(chId)
    const c = channel(chId)
    if (push) navigate(c?.archived ? 'archive' : 'chat')
  }
  const openFile = (file: FileAtt, sharedBy: string, channelId: string) => {
    setOpenFile({ file, sharedBy, channelId })
    navigate('file')
  }

  const createSubgroup = (moduleId: string, name: string, type: string) => {
    const id = nextId('sub')
    setChannels((cs) => [...cs, { id, name, icon: '💬', moduleId, members: 1, messages: [] }])
    setActiveChannelId(id)
    setSubgroupModal(null)
    markOb(2)
    toast(`${type} „${name}“ erstellt`)
    return id
  }
  const createCustomGroup = (name: string, type: string, invitees: string[]) => {
    const id = nextId('custom')
    const icon = type === 'Studiengruppe' ? '📖' : type.startsWith('AStA') ? '🏛️' : '🔧'
    setChannels((cs) => [...cs, { id, name, icon, members: 1, messages: [] }])
    setInviteMap((m) => ({ ...m, [id]: { pending: invitees, members: [{ id: 'self', role: 'Ersteller' }] } }))
    setActiveChannelId(id)
    replace('chat')
    toast(invitees.length ? `Gruppe erstellt · ${invitees.length} Einladung(en) gesendet` : 'Gruppe erstellt')
  }

  // ── Catalog ──
  const joinModule = (id: string) => {
    const m = modules.find((x) => x.id === id)
    if (!m) return
    setModules((ms) => ms.map((x) => (x.id === id ? { ...x, joined: true } : x)))
    if (!channels.some((c) => c.moduleId === id && c.name === 'Hauptkanal')) {
      setChannels((cs) => [...cs, { id: `${id}-main`, name: 'Hauptkanal', icon: '💬', moduleId: id, members: m.participants + 1, messages: [] }])
    }
    markOb(1)
    toast(`${m.full} beigetreten`)
  }

  // ── Members / invites ──
  const inviteState = (chId: string): InviteState =>
    inviteMap[chId] ?? { pending: ['abcdit44'], members: [{ id: 'self', role: 'Ersteller' }, { id: 'abcdit09', role: 'Mitglied' }] }
  const updateInvite = (chId: string, fn: (s: InviteState) => InviteState) =>
    setInviteMap((m) => ({ ...m, [chId]: fn(m[chId] ?? inviteState(chId)) }))
  const sendInvite = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, pending: [...s.pending, user] }))
    markOb(3)
    toast(`Einladung an ${user} gesendet`)
  }
  const withdrawInvite = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, pending: s.pending.filter((p) => p !== user) }))
    toast('Einladung zurückgezogen')
  }
  const removeMember = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, members: s.members.filter((p) => p.id !== user) }))
    toast(`${user} entfernt`)
  }

  // ── Invitations ──
  const respondInvitation = (id: string, accept: boolean) => {
    const inv = invitations.find((i) => i.id === id)
    if (!inv) return
    setInvitations((is) => is.map((i) => (i.id === id ? { ...i, status: accept ? 'accepted' : 'rejected', when: 'gerade eben' } : i)))
    if (accept) {
      setChannels((cs) => [
        ...cs,
        {
          id: `inv-${id}`,
          name: inv.channelName,
          icon: inv.icon,
          moduleId: inv.moduleId,
          members: 6,
          messages: [{ id: nextId('w'), from: inv.from, time: nowTime(), text: `Willkommen in ${inv.channelName}! 👋` }],
        },
      ])
    }
    toast(accept ? `${inv.channelName} beigetreten` : 'Einladung abgelehnt')
  }

  // ── Notifications ──
  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))
  const openNotif = (n: Notif) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
    const t: NotifTarget = n.target
    if (t.type === 'invitations') navigate('invitations')
    else if (t.type === 'archive') openChannel('archiv-mathe1')
    else if (t.type === 'catalog') navigate('catalog')
    else if (channel(t.channelId)) openChannel(t.channelId)
  }

  // ── Jump nav ──
  const jump = (jid: string) => {
    const map: Record<string, () => void> = {
      s01: () => reset('splash'),
      s02: () => reset('login'),
      s03: () => reset(['login', 'register']),
      s04: () => reset('onboarding'),
      s05: () => (setActiveChannelId('lg-a'), reset('chats')),
      s06: () => (setActiveChannelId('lg-a'), reset(['chats', 'chat'])),
      s07: () => (setActiveChannelId('archiv-mathe1'), reset(['chats', 'archive'])),
      s08: () => reset('catalog'),
      s09: () => {
        setActiveChannelId('lg-a')
        reset(['chats', 'chat'])
        setSubgroupModal('mathe1')
      },
      s10: () => reset(['chats', 'freegroup']),
      s11: () => (setActiveChannelId('lg-a'), reset(['chats', 'chat', 'invite'])),
      s12: () => reset('invitations'),
      s13: () => (setOpenFile({ file: TAFEL, sharedBy: 'abcdit09', channelId: 'lg-a' }), reset(['chats', 'chat', 'file'])),
      s14: () => reset(['chats', 'profile']),
      s15: () => reset(['chats', 'profile', 'settings']),
      s16: () => reset('notifications'),
    }
    map[jid]?.()
  }
  const currentJump = subgroupModal ? 's09' : SCREEN_TO_JUMP[screen]

  return {
    screen, stack, dir, navKey, navigate, replace, reset, back, tab, jump, currentJump,
    toastMsg, toast,
    userId, displayName, setDisplayName, remember, setRemember, login, register, logout, finishSplash,
    onboarded, setOnboarded, obDone,
    modules, channels, channel, moduleOf, activeChannel, activeChannelId, setActiveChannelId, openChannel,
    typing, sendMessage, attachFile, openFile, openFileState,
    subgroupModal, setSubgroupModal, createSubgroup, createCustomGroup,
    joinModule,
    inviteState, sendInvite, withdrawInvite, removeMember,
    invitations, respondInvitation,
    notifs, markAllRead, openNotif,
    settings, setSettings,
    collapsed, toggleCollapsed,
  }
}

export type Proto = ReturnType<typeof useProtoState>
const Ctx = createContext<Proto | null>(null)

export function ProtoProvider({ children }: { children: ReactNode }) {
  const value = useProtoState()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProto() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProto outside provider')
  return v
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'MM'
