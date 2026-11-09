import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
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
import { fileToBase64 } from '../utils/fileToBase64';
import {
  buildCustomGroupRoomName,
  buildModuleMainRoomName,
  buildSubgroupRoomName,
  formatFileSize,
  parseChatInvite,
  parseChatMessage,
  parseChatRoom,
} from '../utils/roomParser';

export type Dir = 'push' | 'pop' | 'fade';
export type Member = { id: string; role: string; hash?: string };
export type InviteState = { pending: string[]; members: Member[] };
export type OpenFile = { file: FileAtt; sharedBy: string; channelId: string };

const POLL_INTERVAL_MS = 3000;

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
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('onboarded') === 'true');
  const [obDone, setObDone] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('obDone');
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('displayName', displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem('onboarded', String(onboarded));
  }, [onboarded]);

  useEffect(() => {
    localStorage.setItem('obDone', JSON.stringify(obDone));
  }, [obDone]);

  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
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

  useEffect(() => {
    if (auth.sessionError) {
      toast(auth.sessionError);
      if (screen !== 'login' && screen !== 'register' && screen !== 'splash') {
        reset('login', 'pop');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.sessionError]);

  // ── Load rooms (getchats) and invites (getinvites) from Backend ──
  const reloadRooms = useCallback(async () => {
    if (!auth.token) return;
    setLoadingRooms(true);
    try {
      const [chatsRes, invitesRes] = await Promise.all([
        chatApi.getChats(auth.token),
        chatApi.getInvites(auth.token).catch(() => ({ invites: [] })),
      ]);

      const rawRooms = chatsRes.chats ?? [];
      setChannels((prev) => {
        const msgMap = new Map(prev.map((c) => [c.id, c.messages]));
        const parsed = rawRooms.map((r) => parseChatRoom(r, msgMap.get(String(r.chatid)) ?? []));
        return parsed;
      });

      const joinedModIds = new Set(
        rawRooms
          .map((r) => parseChatRoom(r))
          .filter((c) => !c.archived && c.moduleId)
          .map((c) => c.moduleId!),
      );
      if (joinedModIds.size > 0) {
        setModules((prevMods) =>
          prevMods.map((m) => (joinedModIds.has(m.id) ? { ...m, joined: true } : m)),
        );
      }

      const serverInvites = (invitesRes.invites ?? []).map(parseChatInvite);
      setInvitations((prevInv) => {
        const archivedInv = prevInv.filter((i) => i.status !== 'open');
        const archivedIds = new Set(archivedInv.map((i) => i.id));
        const openFiltered = serverInvites.filter((i) => !archivedIds.has(i.id));
        return [...openFiltered, ...archivedInv];
      });
    } catch (e) {
      toast(formatError(e));
    } finally {
      setLoadingRooms(false);
    }
  }, [auth.token, toast]);

  useEffect(() => {
    if (auth.token) {
      reloadRooms();
    } else {
      setChannels([]);
      setInvitations([]);
    }
  }, [auth.token, reloadRooms]);

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

  // ── Load & Poll Messages (getmessages) for activeChannel ──
  const pollMessagesNow = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!auth.token || !activeChannel) return;
    const targetChatId = activeChannel.chatid;
    const targetIdStr = String(targetChatId);
    let lastId = 0;
    let cancelled = false;

    const poll = async () => {
      if (!auth.token) return;
      try {
        const res = await chatApi.getMessages(auth.token, targetChatId, lastId);
        if (cancelled) return;
        const rawMsgs = res.messages ?? [];
        if (rawMsgs.length > 0) {
          lastId = Math.max(lastId, ...rawMsgs.map((m) => Number(m.id)));
          const parsedMsgs = rawMsgs.map((m) =>
            parseChatMessage(m, auth.userId, auth.token ?? undefined),
          );
          setChannels((prev) =>
            prev.map((c) => {
              if (c.id !== targetIdStr) return c;
              const knownIds = new Set(c.messages.map((x) => x.id));
              const merged = [...c.messages, ...parsedMsgs.filter((x) => !knownIds.has(x.id))];
              return { ...c, messages: merged };
            }),
          );
        }
      } catch {
        // Ignore transient polling errors for non-existent/unjoined rooms
      }
    };

    pollMessagesNow.current = poll;
    poll();

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auth.token, auth.userId, activeChannel.chatid]);

  // Also preload messages for archived room when archive screen opens
  useEffect(() => {
    if (screen !== 'archive' || !auth.token) return;
    const arch = channels.find((c) => c.archived);
    if (!arch) return;
    chatApi
      .getMessages(auth.token, arch.chatid, 0)
      .then((res) => {
        const parsed = (res.messages ?? []).map((m) =>
          parseChatMessage(m, auth.userId, auth.token ?? undefined),
        );
        setChannels((prev) =>
          prev.map((c) => (c.id === arch.id ? { ...c, messages: parsed } : c)),
        );
      })
      .catch(() => {});
  }, [screen, auth.token, auth.userId, channels.length]);

  const markOb = (n: number) => setObDone((d) => (d.includes(n) ? d : [...d, n]));

  // ── Auth actions connected to chatApi ──
  const finishSplash = useCallback(() => {
    if (auth.token && auth.remember) {
      reset(onboarded ? 'chats' : 'onboarding');
    } else {
      reset('login');
    }
  }, [auth.token, auth.remember, onboarded]);

  const login = async (id: string, password: string, keep: boolean): Promise<string | null> => {
    const cleanId = (id.trim() || auth.userId || 'asesit00').toLowerCase();
    const cleanPw = password || 'password123';
    try {
      const res = await chatApi.login(cleanId, cleanPw);
      if (!res.token) {
        return 'Server hat kein gültiges Session-Token zurückgegeben.';
      }
      auth.setUserId(cleanId);
      auth.setToken(res.token, keep);

      chatApi
        .getProfiles(res.token)
        .then((profRes) => {
          const me = profRes.profiles?.find((p) => p.userid.toLowerCase() === cleanId);
          if (me?.fullname) setDisplayName(me.fullname);
          else if (me?.nickname) setDisplayName(me.nickname);
        })
        .catch(() => {});

      reset(onboarded ? 'chats' : 'onboarding', 'push');
      return null;
    } catch (err) {
      const msg = formatError(err);
      toast(msg);
      return msg;
    }
  };

  const register = async (id: string, name: string, password: string): Promise<string | null> => {
    const cleanId = id.trim().toLowerCase();
    const display = name.trim() || cleanId;
    const nick = display.slice(0, 30);
    const full = display.length >= 2 ? display.slice(0, 30) : `${cleanId} (Studierender)`;

    try {
      const res = await chatApi.register(cleanId, password, nick, full);
      if (!res.token) {
        return 'Server hat kein gültiges Session-Token zurückgegeben.';
      }
      auth.setUserId(cleanId);
      setDisplayName(full);
      setOnboarded(false);
      setObDone([]);
      auth.setToken(res.token, true);
      reset('onboarding', 'push');
      return null;
    } catch (err) {
      const msg = formatError(err);
      toast(msg);
      return msg;
    }
  };

  const logout = async () => {
    await auth.logout();
    reset('login', 'pop');
    toast('Abgemeldet');
  };

  // ── Messages & Attachments (postmessage) ──
  const sendMessage = async (chId: string, text: string) => {
    const target = channel(chId) ?? activeChannel;
    if (!auth.token || !text.trim() || target.archived) return;
    try {
      await chatApi.postMessage(auth.token, {
        chatid: target.chatid,
        text: text.trim(),
      });
      await pollMessagesNow.current();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const attachFile = async (chId: string, selectedFile?: File) => {
    const target = channel(chId) ?? activeChannel;
    if (!auth.token || target.archived) return;

    try {
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        const isImg = selectedFile.type.startsWith('image/');
        const sizeLabel = formatFileSize(selectedFile.size);
        const metaText = `[ATTACHMENT::${selectedFile.name}::${sizeLabel}::${isImg ? 'img' : 'pdf'}]`;

        await chatApi.postMessage(auth.token, {
          chatid: target.chatid,
          text: metaText,
          photo: isImg ? base64 : undefined,
          file: !isImg ? base64 : undefined,
        });
      } else {
        // Fallback quick-attach if triggered without file picker
        const n =
          target.messages.filter((m) => m.file && m.from === 'self').length + 1;
        const fname = `Notizen_${n}.pdf`;
        const fsize = `${120 + n * 37} KB`;
        const metaText = `[ATTACHMENT::${fname}::${fsize}::pdf]`;
        await chatApi.postMessage(auth.token, {
          chatid: target.chatid,
          text: metaText,
          file: 'data:application/pdf;base64,JVBERi0xLjQKJcfs...',
        });
      }
      await pollMessagesNow.current();
      toast('Datei hochgeladen');
    } catch (e) {
      toast(formatError(e));
    }
  };

  // ── Room & Group creation / joining / leaving connected to chatApi ──
  const openChannel = (chId: string, push = true) => {
    setActiveChannelId(chId);
    const c = channel(chId);
    if (push) navigate(c?.archived ? 'archive' : 'chat');
  };

  const openFile = (file: FileAtt, sharedBy: string, channelId: string) => {
    setOpenFile({ file, sharedBy, channelId });
    navigate('file');
  };

  const leaveChannel = async (chId: string) => {
    const target = channel(chId);
    if (!target || !auth.token) return;
    try {
      await chatApi.leaveChat(auth.token, target.chatid);
      setChannels((cs) => cs.filter((c) => c.id !== chId));
      toast(`${target.name} verlassen`);
      back();
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const createSubgroup = async (moduleId: string, name: string, type: string): Promise<string | undefined> => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || !auth.token) return undefined;
    const rawName = buildSubgroupRoomName(mod, name);
    try {
      const res = await chatApi.createChat(auth.token, rawName, false);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);
      const optimistic: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: name.trim(),
        icon: '💬',
        moduleId,
        members: 1,
        visibility: 'private',
        messages: [],
      };
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), optimistic]);
      setActiveChannelId(newId);
      setSubgroupModal(null);
      markOb(2);
      toast(`${type} „${name.trim()}“ erstellt`);
      reloadRooms();
      return newId;
    } catch (e) {
      toast(formatError(e));
      return undefined;
    }
  };

  const createCustomGroup = async (name: string, type: string, invitees: string[]) => {
    if (!auth.token) return;
    const rawName = buildCustomGroupRoomName(name);
    const icon = type === 'Studiengruppe' ? '📖' : type.startsWith('AStA') ? '🏛️' : '🔧';
    try {
      const res = await chatApi.createChat(auth.token, rawName, false);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);
      const optimistic: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: name.trim(),
        icon,
        members: 1,
        visibility: 'private',
        messages: [],
      };
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), optimistic]);
      setInviteMap((m) => ({
        ...m,
        [newId]: { pending: invitees, members: [{ id: 'self', role: 'Ersteller' }] },
      }));

      if (invitees.length > 0) {
        chatApi
          .getProfiles(auth.token)
          .then(async (profRes) => {
            const profiles = profRes.profiles ?? [];
            for (const targetUid of invitees) {
              const found = profiles.find(
                (p) => p.userid.toLowerCase() === targetUid.trim().toLowerCase(),
              );
              if (found && auth.token) {
                await chatApi.invite(auth.token, newChatId, found.hash).catch(() => {});
              }
            }
          })
          .catch(() => {});
      }

      setActiveChannelId(newId);
      replace('chat');
      toast(
        invitees.length
          ? `Gruppe erstellt · ${invitees.length} Einladung(en) gesendet`
          : 'Gruppe erstellt',
      );
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const joinModule = async (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m || !auth.token) return;

    setModules((ms) => ms.map((x) => (x.id === id ? { ...x, joined: true } : x)));

    const existingMain = channels.find(
      (c) => !c.archived && c.moduleId === id && c.name === 'Hauptkanal',
    );
    if (!existingMain) {
      const rawName = buildModuleMainRoomName(m);
      try {
        const res = await chatApi.createChat(auth.token, rawName, true);
        const newChatId = Number(res.chatid);
        const newId = String(newChatId);
        setChannels((cs) => [
          ...cs,
          {
            id: newId,
            chatid: newChatId,
            rawName,
            name: 'Hauptkanal',
            icon: '💬',
            moduleId: id,
            members: m.participants + 1,
            visibility: 'public',
            messages: [],
          },
        ]);
        reloadRooms();
      } catch {
        // Fallback if createChat fails
      }
    }
    markOb(1);
    toast(`${m.full} beigetreten`);
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
    onboarded,
    setOnboarded,
    obDone,
    markOb,
    finishSplash,
    login,
    register,
    logout,

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

    // Rooms, Catalog & Groups
    modules,
    setModules,
    channels,
    setChannels,
    loadingRooms,
    reloadRooms,
    channel,
    moduleOf,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    openChannel,
    leaveChannel,
    createSubgroup,
    createCustomGroup,
    joinModule,

    // Messages & Attachments
    typing,
    setTyping,
    sendMessage,
    attachFile,
    openFile,
    openFileState,

    // Invites & Notifications (Step 5-6)
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
