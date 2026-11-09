import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  INITIAL_MODULES,
  TAFEL,
  type Channel,
  type FileAtt,
  type Invitation,
  type Module,
  type Notif,
  type NotifTarget,
  type ScreenId,
} from '../data/catalog';
import { useAuth } from '../hooks/useAuth';

export type Dir = 'push' | 'pop' | 'fade';
export type Member = { id: string; role: string; hash?: string };
export type InviteState = { pending: string[]; members: Member[] };
export type OpenFile = { file: FileAtt; sharedBy: string; channelId: string };

const INITIAL_NOTIFS: Notif[] = [
  { id: 'n1', unread: true, time: 'vor 2 Stunden', target: { type: 'invitations' }, html: <><strong>abcdit44</strong> hat dich zur <strong>Lerngruppe B</strong> eingeladen.</> },
  { id: 'n2', unread: true, time: 'vor 3 Stunden', target: { type: 'channel', channelId: '1' }, html: <><strong>[Dozent]</strong> prof.mueller hat eine neue Nachricht in <strong>Mathe 1</strong> gepostet.</> },
  { id: 'n3', unread: true, time: 'vor 4 Stunden', target: { type: 'channel', channelId: '2' }, html: <><strong>abcdit09</strong> hat eine Datei in <strong>Lerngruppe A</strong> geteilt.</> },
  { id: 'n4', unread: false, time: 'gestern', target: { type: 'channel', channelId: '4' }, html: <>Du bist <strong>Programmierung 1</strong> beigetreten.</> },
  { id: 'n5', unread: false, time: 'vor 1 Monat', target: { type: 'archive' }, html: <>Kurs <strong>Mathe 1 (SS25)</strong> wurde archiviert. Nur-Lese-Modus aktiv.</> },
];

function useAppState() {
  const auth = useAuth();
  const [stack, setStack] = useState<ScreenId[]>(['splash']);
  const [dir, setDir] = useState<Dir>('fade');
  const [navKey, setNavKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null);

  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') ?? 'Max Mustermann');
  const [remember, setRemember] = useState(() => localStorage.getItem('remember') !== 'false');
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('onboarded') === 'true');
  const [obDone, setObDone] = useState<number[]>([]);

  useEffect(() => {
    localStorage.setItem('displayName', displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem('remember', String(remember));
  }, [remember]);

  useEffect(() => {
    localStorage.setItem('onboarded', String(onboarded));
  }, [onboarded]);

  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('2');
  const [typing, setTyping] = useState<string | null>(null);
  const [openFileState, setOpenFile] = useState<OpenFile>({ file: TAFEL, sharedBy: 'abcdit09', channelId: '2' });
  const [subgroupModal, setSubgroupModal] = useState<string | null>(null);
  const [inviteMap, setInviteMap] = useState<Record<string, InviteState>>({});
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS);
  const [settings, setSettings] = useState({ push: true, mentionsOnly: false, showArchived: true });
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const toggleCollapsed = (id: string) =>
    setCollapsed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const screen = stack[stack.length - 1];
  const bump = (d: Dir) => {
    setDir(d);
    setNavKey((k) => k + 1);
  };

  const navigate = useCallback((id: ScreenId) => {
    setStack((s) => [...s, id]);
    bump('push');
  }, []);

  const replace = (id: ScreenId) => {
    setStack((s) => [...s.slice(0, -1), id]);
    bump('push');
  };

  const reset = (ids: ScreenId | ScreenId[], d: Dir = 'fade') => {
    setStack(Array.isArray(ids) ? ids : [ids]);
    setSubgroupModal(null);
    bump(d);
  };

  const back = () => {
    setSubgroupModal(null);
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : ['chats']));
    bump('pop');
  };

  const tab = (id: ScreenId) => {
    if (id === 'chats') setOnboarded(true);
    reset(id);
  };

  const toast = useCallback((text: string) => {
    const id = Date.now();
    setToastMsg({ id, text });
    later(() => setToastMsg((t) => (t?.id === id ? null : t)), 2400);
  }, []);

  const channel = (id: string) => channels.find((c) => c.id === id);
  const moduleOf = (c?: Channel) => modules.find((m) => m.id === c?.moduleId);
  const activeChannel: Channel = channel(activeChannelId) ??
    channels[0] ?? {
      id: '1',
      chatid: 1,
      rawName: 'WS26::MOD::Mathe_1::MAIN',
      name: 'Hauptkanal',
      icon: '💬',
      moduleId: 'mathe1',
      members: 120,
      messages: [],
    };

  const markOb = (n: number) => setObDone((d) => (d.includes(n) ? d : [...d, n]));

  const finishSplash = () => {
    if (auth.token && remember) {
      reset(onboarded ? 'chats' : 'onboarding');
    } else {
      reset('login');
    }
  };

  const openChannel = (chId: string, push = true) => {
    setActiveChannelId(chId);
    const c = channel(chId);
    if (push) navigate(c?.archived ? 'archive' : 'chat');
  };

  const openFile = (file: FileAtt, sharedBy: string, channelId: string) => {
    setOpenFile({ file, sharedBy, channelId });
    navigate('file');
  };

  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })));
  const openNotif = (n: Notif) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    const t: NotifTarget = n.target;
    if (t.type === 'invitations') navigate('invitations');
    else if (t.type === 'archive') {
      const arch = channels.find((c) => c.archived);
      if (arch) openChannel(arch.id);
      else navigate('archive');
    } else if (t.type === 'catalog') navigate('catalog');
    else if (channel(t.channelId)) openChannel(t.channelId);
  };

  return {
    // Auth
    ...auth,
    displayName,
    setDisplayName,
    remember,
    setRemember,
    onboarded,
    setOnboarded,
    obDone,
    markOb,
    finishSplash,

    // Navigation & UI
    screen,
    stack,
    dir,
    navKey,
    navigate,
    replace,
    reset,
    back,
    tab,
    toastMsg,
    toast,

    // Data state (will be connected to backend endpoints in Steps 2-6)
    modules,
    setModules,
    channels,
    setChannels,
    channel,
    moduleOf,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    openChannel,
    typing,
    setTyping,
    openFile,
    openFileState,
    subgroupModal,
    setSubgroupModal,
    inviteMap,
    setInviteMap,
    invitations,
    setInvitations,
    notifs,
    setNotifs,
    markAllRead,
    openNotif,
    settings,
    setSettings,
    collapsed,
    toggleCollapsed,
  };
}

export type AppContextType = ReturnType<typeof useAppState>;
const Ctx = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'MM';
