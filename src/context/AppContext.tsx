import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
import {
  getServerMode,
  isMockModeEnabled,
  setServerModeStore,
  type ServerMode,
} from '../api/mockServer';
import {
  CATEGORIES,
  INITIAL_MODULES,
  slugifyName,
  TAFEL,
  type Channel,
  type FileAtt,
  type Invitation,
  type Module,
  type Msg,
  type Notif,
  type NotifTarget,
  type ScreenId,
} from '../data/catalog';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile } from '../types';
import { fileToBase64 } from '../utils/fileToBase64';
import {
  buildCustomGroupRoomName,
  buildModuleMainRoomName,
  buildSubgroupRoomName,
  formatFileSize,
  isRoomJoined,
  parseChatInvite,
  parseChatMessage,
  parseChatRoom,
  syncModulesWithServerRooms,
} from '../utils/roomParser';

export type Dir = 'push' | 'pop' | 'fade';
export type Member = { id: string; role: string; hash?: string };
export type InviteState = { pending: string[]; members: Member[] };
export type OpenFile = { file: FileAtt; sharedBy: string; channelId: string };

type FontScale = 'standard' | 'large' | 'xlarge';
type ChatLoadState = 'loading' | 'ready' | 'error';
type OutgoingMessage = {
  chatId: string;
  token: string;
  mode: ServerMode;
  text: string;
  file?: File;
  message: Msg;
  afterId: number;
  confirmedId?: number;
};

function latestMessageId(channel: Channel) {
  return channel.messages.reduce((lastId, message) => Math.max(lastId, Number(message.id) || 0), 0);
}

function reconcileOutgoing(items: OutgoingMessage[], channels: Channel[], token: string | null, mode: ServerMode) {
  const current = items.filter((item) => item.token === token && item.mode === mode);
  const claimed = new Map<string, Set<number>>();
  const claimedIn = (chatId: string) => {
    const ids = claimed.get(chatId) ?? new Set<number>();
    claimed.set(chatId, ids);
    return ids;
  };
  for (const item of current) {
    if (item.confirmedId !== undefined) claimedIn(item.chatId).add(item.confirmedId);
  }

  const reconciled = current.map((item) => {
    if (item.message.status !== 'sent' || item.confirmedId !== undefined) return item;
    const ids = claimedIn(item.chatId);
    const match = channels.find((room) => room.id === item.chatId)?.messages.find((message) => {
      const id = Number(message.id);
      return message.from === 'self' && message.rawText === item.text && id > item.afterId && !ids.has(id);
    });
    if (!match) return item;
    const confirmedId = Number(match.id);
    ids.add(confirmedId);
    return { ...item, confirmedId };
  });

  // A server message can confirm only one send, even when two identical sends finish out of order.
  const unresolved = reconciled.filter((item) => item.confirmedId === undefined && item.message.status !== 'failed');
  const retained = reconciled.filter((item) => {
    const { confirmedId } = item;
    return confirmedId === undefined || unresolved.some((other) =>
      other.chatId === item.chatId && other.text === item.text && other.afterId < confirmedId,
    );
  });
  return retained.length === items.length && retained.every((item, index) => item === items[index]) ? items : retained;
}

const SETTINGS_KEY = 'hey-accessibility-settings';
const DEFAULT_SETTINGS = {
  push: true,
  mentionsOnly: false,
  showArchived: true,
  highContrast: false,
  fontScale: 'standard' as FontScale,
  showTabLabels: false,
};

function loadSettings(): typeof DEFAULT_SETTINGS {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      push: stored.push !== false,
      mentionsOnly: stored.mentionsOnly === true,
      showArchived: stored.showArchived !== false,
      highContrast: stored.highContrast === true,
      fontScale: stored.fontScale === 'large' || stored.fontScale === 'xlarge'
        ? stored.fontScale
        : 'standard',
      showTabLabels: stored.showTabLabels === true,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const POLL_INTERVAL_MS = 3000;

const MOCK_ARCHIVED_INVITATIONS: Invitation[] = [
  { id: 'arch-1', chatid: 3, room: 'Übungsblatt 3 — Mathe 1', icon: '💬', from: 'abcdit09', when: '3 Tage her', status: 'accepted', channelName: 'Übungsblatt 3' },
  { id: 'arch-2', chatid: 99, room: 'Gaming-Gruppe', icon: '🎮', from: 'abcdit77', when: '1 Woche her', status: 'rejected', channelName: 'Gaming-Gruppe' },
];

const MOCK_INITIAL_NOTIFS: Notif[] = [
  { id: 'n1', unread: true, time: 'vor 2 Stunden', target: { type: 'invitations' }, html: <><strong>abcdit44</strong> hat dich zur <strong>Lerngruppe B</strong> eingeladen.</> },
  { id: 'n2', unread: true, time: 'vor 3 Stunden', target: { type: 'channel', channelId: '1' }, html: <><strong>[Dozent]</strong> prof.mueller hat eine neue Nachricht in <strong>Mathe 1</strong> gepostet.</> },
  { id: 'n3', unread: true, time: 'vor 4 Stunden', target: { type: 'channel', channelId: '2' }, html: <><strong>abcdit09</strong> hat eine Datei in <strong>Lerngruppe A</strong> geteilt.</> },
  { id: 'n4', unread: false, time: 'gestern', target: { type: 'channel', channelId: '4' }, html: <>Du bist <strong>Programmierung 1</strong> beigetreten.</> },
  { id: 'n5', unread: false, time: 'vor 2 Tagen', target: { type: 'channel', channelId: '3' }, html: <><strong>abcdit09</strong> hat deine Einladung zu <strong>Übungsblatt 3</strong> angenommen.</> },
  { id: 'n6', unread: false, time: 'vor 1 Monat', target: { type: 'archive' }, html: <>Kurs <strong>Mathe 1 (SS25)</strong> wurde archiviert. Nur-Lese-Modus aktiv.</> },
];

function useAppState() {
  const auth = useAuth();
  const [serverMode, setServerModeState] = useState<ServerMode>(() => getServerMode());
  const mockMode = serverMode === 'mock';
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

  const [modules, setModules] = useState<Module[]>(() =>
    INITIAL_MODULES.map((m) => ({ ...m, joined: isMockModeEnabled() ? m.joined : false })),
  );
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string>('1');
  const [typing, setTyping] = useState<string | null>(null);
  const [openFileState, setOpenFile] = useState<OpenFile>({ file: TAFEL, sharedBy: 'abcdit09', channelId: '2' });
  const [subgroupModal, setSubgroupModal] = useState<string | null>(null);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [inviteMap, setInviteMap] = useState<Record<string, InviteState>>({});
  const [invitations, setInvitations] = useState<Invitation[]>(() =>
    isMockModeEnabled() ? MOCK_ARCHIVED_INVITATIONS : [],
  );
  const [notifs, setNotifs] = useState<Notif[]>(() =>
    isMockModeEnabled() ? MOCK_INITIAL_NOTIFS : [],
  );
  const [settings, setSettings] = useState(loadSettings);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [semesterTab, setSemesterTab] = useState<'current' | 'ss25' | 'more'>('current');

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
    setModuleModalOpen(false);
    bump(d);
  };

  const back = () => {
    setSubgroupModal(null);
    setModuleModalOpen(false);
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

  const setServerMode = (mode: ServerMode) => {
    setServerModeStore(mode);
    setServerModeState(mode);
    auth.syncModeToken(mode);
    const useMock = mode === 'mock';
    setChannels([]);
    setInvitations(useMock ? MOCK_ARCHIVED_INVITATIONS : []);
    setNotifs(useMock ? MOCK_INITIAL_NOTIFS : []);
    setModules(INITIAL_MODULES.map((m) => ({ ...m, joined: useMock ? m.joined : false })));
  };

  const setMockMode = (useMock: boolean) => {
    setServerMode(useMock ? 'mock' : 'live');
  };

  useEffect(() => {
    if (auth.sessionError) {
      toast(auth.sessionError);
      if (screen !== 'login' && screen !== 'register' && screen !== 'splash') {
        reset('login', 'pop');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.sessionError]);

  // ── Load rooms (getchats), invites (getinvites), and profiles (getprofiles) from Backend ──
  const roomsRequest = useRef(0);
  const invalidateRoomsRequest = useCallback(() => { roomsRequest.current++; }, []);
  const reloadRooms = useCallback(async () => {
    if (!auth.token || !auth.isSessionReady) return;
    const request = ++roomsRequest.current;
    const current = () => request === roomsRequest.current && getServerMode() === serverMode;
    setLoadingRooms(true);
    try {
      const [chatsRes, invitesRes, profilesRes] = await Promise.all([
        chatApi.getChats(auth.token),
        chatApi.getInvites(auth.token).catch(() => ({ invites: [] })),
        chatApi.getProfiles(auth.token).catch(() => ({ profiles: [] })),
      ]);
      if (!current()) return;

      const rawRooms = chatsRes.chats ?? [];
      const fetchedProfiles = profilesRes.profiles ?? [];
      setProfiles(fetchedProfiles);

      // Update displayName if current user exists in server profiles
      const myProfile = fetchedProfiles.find(
        (p) => p.userid.toLowerCase() === auth.userId.toLowerCase(),
      );
      if (myProfile?.fullname) {
        setDisplayName(myProfile.fullname);
      } else if (myProfile?.nickname) {
        setDisplayName(myProfile.nickname);
      }

      // Sync modules (including dynamically created server modules!)
      const syncedMods = syncModulesWithServerRooms(rawRooms, INITIAL_MODULES, isMockModeEnabled());
      setModules((prevMods) => syncModulesWithServerRooms(rawRooms, prevMods, isMockModeEnabled()));

      const parsed = rawRooms
        .filter((room) => Number(room.chatid) === 0 || isRoomJoined(room))
        .map((room) => parseChatRoom(room, [], syncedMods));
      setChannels((prev) => {
        const messages = new Map(prev.map((c) => [c.id, c.messages]));
        return parsed.map((c) => ({ ...c, messages: messages.get(c.id) ?? [] }));
      });
      setActiveChannelId((id) => parsed.some((c) => c.id === id) ? id : (parsed[0]?.id ?? id));

      const serverInvites = (invitesRes.invites ?? []).map((inv) =>
        parseChatInvite(inv, syncedMods.length ? syncedMods : INITIAL_MODULES),
      );
      setInvitations((prevInv) => {
        const archivedInv = prevInv.filter((i) => i.status !== 'open');
        const archivedChatIds = new Set(archivedInv.map((i) => i.chatid));
        const openFiltered = serverInvites.filter((i) => !archivedChatIds.has(i.chatid));
        return [...openFiltered, ...archivedInv];
      });

      // Surface real server invitations as notifications in Live mode
      if (!isMockModeEnabled() && serverInvites.length > 0) {
        setNotifs((prevNotifs) => {
          const existingIds = new Set(prevNotifs.map((n) => n.id));
          const inviteNotifs: Notif[] = serverInvites
            .filter((inv) => !existingIds.has(`inv-notif-${inv.id}`))
            .map((inv) => ({
              id: `inv-notif-${inv.id}`,
              unread: true,
              time: inv.when,
              target: { type: 'invitations' as const },
              html: (
                <>
                  <strong>{inv.from}</strong> hat dich zu <strong>{inv.room}</strong> eingeladen.
                </>
              ),
            }));
          return [...inviteNotifs, ...prevNotifs];
        });
      }
      return parsed;
    } catch (e) {
      if (current()) toast(formatError(e));
    } finally {
      if (current()) setLoadingRooms(false);
    }
  }, [auth.token, auth.isSessionReady, auth.userId, serverMode, toast]);

  useEffect(() => {
    if (auth.token && auth.isSessionReady) {
      reloadRooms();
    } else {
      setLoadingRooms(false);
      if (!auth.token) {
        setChannels([]);
        setInvitations(isMockModeEnabled() ? MOCK_ARCHIVED_INVITATIONS : []);
      }
    }
    return invalidateRoomsRequest;
  }, [auth.token, auth.isSessionReady, serverMode, reloadRooms, invalidateRoomsRequest]);

  const channel = (id: string) => channels.find((c) => c.id === id);
  const moduleOf = (c?: Channel) => modules.find((m) => m.id === c?.moduleId);
  const moduleMainChannel = (id: string) =>
    channels.find((c) => !c.archived && c.moduleId === id && c.name === 'Hauptkanal');
  const activeChannel: Channel = channel(activeChannelId) ??
    channels[0] ?? {
      id: '0',
      chatid: 0,
      rawName: 'Main Chat',
      name: 'Main Chat',
      icon: '💬',
      members: Math.max(1, profiles.length),
      messages: [],
    };

  // ── Load & Poll Messages (getmessages) for activeChannel ──
  const pollMessagesNow = useRef<(chatId?: string) => Promise<void>>(async () => {});
  const activeChatId = activeChannel.chatid;
  const chatLoadKey = JSON.stringify([serverMode, auth.token, activeChatId]);
  const [chatLoad, setChatLoad] = useState<{ key: string; state: ChatLoadState }>();
  const chatLoadState = chatLoad?.key === chatLoadKey ? chatLoad.state : 'loading';

  useEffect(() => {
    if (!auth.token || !auth.isSessionReady) return;
    const targetChatId = activeChatId;
    const targetIdStr = String(targetChatId);
    let lastId = 0;
    let cancelled = false;
    let loaded = false;
    let polling = false;
    let refreshQueued = false;

    const poll = async () => {
      if (!auth.token || cancelled || polling) return;
      polling = true;
      try {
        const res = await chatApi.getMessages(auth.token, targetChatId, lastId);
        if (cancelled) return;
        if (!loaded) {
          loaded = true;
          setChatLoad({ key: chatLoadKey, state: 'ready' });
        }
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
        if (!cancelled && !loaded) setChatLoad({ key: chatLoadKey, state: 'error' });
      } finally {
        polling = false;
        if (refreshQueued && !cancelled) {
          refreshQueued = false;
          void poll();
        }
      }
    };

    pollMessagesNow.current = async (chatId) => {
      if (cancelled || (chatId !== undefined && chatId !== targetIdStr)) return;
      if (polling) {
        refreshQueued = true;
        return;
      }
      if (!loaded) setChatLoad({ key: chatLoadKey, state: 'loading' });
      await poll();
    };
    void poll();

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auth.token, auth.isSessionReady, auth.userId, activeChatId, chatLoadKey]);

  const retryLoadChat = () => void pollMessagesNow.current();

  const markOb = (n: number) => setObDone((d) => (d.includes(n) ? d : [...d, n]));

  // ── Auth actions connected to chatApi ──
  const finishSplash = useCallback(() => {
    if (auth.token && auth.isSessionReady && auth.remember) {
      reset(onboarded ? 'chats' : 'onboarding');
    } else {
      reset('login');
    }
  }, [auth.token, auth.isSessionReady, auth.remember, onboarded]);

  const login = async (id: string, password: string, keep: boolean): Promise<string | null> => {
    const cleanId = (id.trim() || auth.userId || 'jaehit00').toLowerCase();
    const cleanPw = password;
    if (!cleanPw) {
      return 'Bitte Passwort eingeben.';
    }
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
          const list = profRes.profiles ?? [];
          setProfiles(list);
          const me = list.find((p) => p.userid.toLowerCase() === cleanId);
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

  const register = async (
    id: string,
    nicknameInput: string,
    fullnameInput: string,
    password: string,
  ): Promise<string | null> => {
    const cleanId = id.trim().toLowerCase();
    const nick = (nicknameInput.trim() || cleanId).slice(0, 30);
    const full = (fullnameInput.trim() || nick).slice(0, 30);

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
  const outgoingId = useRef(0);
  const [outgoing, setOutgoing] = useState<OutgoingMessage[]>([]);
  const [failedId, setFailedId] = useState<string | null>(null);

  const reconciledOutgoing = useMemo(
    () => reconcileOutgoing(outgoing, channels, auth.token, serverMode),
    [outgoing, channels, auth.token, serverMode],
  );
  useEffect(() => {
    if (reconciledOutgoing !== outgoing) {
      setOutgoing((items) => items === outgoing ? reconciledOutgoing : items);
    }
  }, [outgoing, reconciledOutgoing]);

  useEffect(() => {
    setFailedId(null);
  }, [auth.token, serverMode]);

  const pending = reconciledOutgoing.filter(
    (item) => item.chatId === activeChannel.id && item.confirmedId === undefined,
  );
  const sendFail = pending.find((item) => item.message.id === failedId && item.message.status === 'failed');
  const setSendFail = (failed: { msgId: string } | null) => setFailedId(failed?.msgId ?? null);

  const postOutgoing = async (item: OutgoingMessage, target: Channel) => {
    const { file, text, message, token, mode } = item;
    const remove = () => setOutgoing((items) => items.filter((entry) => entry.message.id !== message.id));

    try {
      if (!file) {
        await chatApi.postMessage(token, { chatid: target.chatid, text });
      } else {
        const base64 = await fileToBase64(file);
        if (getServerMode() !== mode) {
          remove();
          return;
        }
        const isImage = message.file?.kind === 'img';
        await chatApi.postMessage(token, {
          chatid: target.chatid,
          text,
          photo: isImage ? base64 : undefined,
          file: !isImage ? base64 : undefined,
        });
      }
    } catch {
      setOutgoing((items) => items.map((entry) =>
        entry.message.id === message.id
          ? { ...entry, message: { ...message, status: 'failed' } }
          : entry,
      ));
      return;
    }

    setOutgoing((items) => items.map((entry) =>
      entry.message.id === message.id
        ? { ...entry, message: { ...message, status: 'sent' } }
        : entry,
    ));
    if (getServerMode() === mode) void pollMessagesNow.current(item.chatId);
  };

  const queueMessage = (chId: string, content: string | File) => {
    const target = channel(chId);
    const token = auth.token;
    if (!target || !token || !auth.isSessionReady || target.archived) return;
    const message: Msg = {
      id: `outgoing-${++outgoingId.current}`,
      from: 'self',
      time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
    };
    let text: string;
    let file: File | undefined;
    if (typeof content === 'string') {
      message.text = content;
      text = content;
    } else {
      file = content;
      message.file = {
        name: content.name,
        size: formatFileSize(content.size),
        kind: content.type.startsWith('image/') ? 'img' : 'pdf',
      };
      text = `[ATTACHMENT::${message.file.name}::${message.file.size}::${message.file.kind}]`;
    }
    const item = { chatId: chId, token, mode: serverMode, text, file, message, afterId: latestMessageId(target) };
    setOutgoing((items) => [...items, item]);
    void postOutgoing(item, target);
  };

  const sendMessage = (chId: string, text: string) => {
    if (text.trim()) queueMessage(chId, text.trim());
  };
  const attachFile = (chId: string, file: File) => queueMessage(chId, file);

  const retryMessage = () => {
    if (!sendFail || getServerMode() !== sendFail.mode) return;
    const message = { ...sendFail.message, status: 'sending' as const };
    const retry = { ...sendFail, message, afterId: latestMessageId(activeChannel) };
    setFailedId(null);
    setOutgoing((items) => items.map((item) =>
      item.message.id === message.id ? retry : item,
    ));
    void postOutgoing(retry, activeChannel);
  };

  const deleteMessage = () => {
    if (!sendFail) return;
    setOutgoing((items) => items.filter((item) => item.message.id !== sendFail.message.id));
    setFailedId(null);
  };

  // ── Room, Module & Subgroup creation / joining / leaving connected to chatApi ──
  const openChannel = (chId: string, push = true) => {
    setActiveChannelId(chId);
    const c = channel(chId);
    setFailedId(null);
    if (push) navigate(c?.archived ? 'archive' : 'chat');
  };

  const openModuleMain = (moduleId: string) => {
    const main = moduleMainChannel(moduleId);
    if (!main) {
      toast('Hauptkanal konnte nicht geöffnet werden');
      return;
    }
    setCollapsed((ids) => ids.filter((id) => id !== moduleId));
    openChannel(main.id);
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

  const leaveModule = async (moduleId: string) => {
    const mod = modules.find((item) => item.id === moduleId);
    const token = auth.token;
    if (!mod || !token) return;
    const rooms = channels.filter((c) => c.moduleId === moduleId && !c.archived);
    const results = await Promise.allSettled(rooms.map((room) => chatApi.leaveChat(token, room.chatid)));
    if (getServerMode() !== serverMode) return;
    const left = new Set(rooms.filter((_, index) => results[index].status === 'fulfilled').map((room) => room.id));
    const failed = results.find((result) => result.status === 'rejected');
    setChannels((items) => items.filter((item) => !left.has(item.id)));
    if (left.has(activeChannelId)) reset('chats', 'pop');
    if (failed) {
      toast(formatError(failed.reason));
    } else {
      setModules((items) => items.map((item) => item.id === moduleId ? { ...item, joined: false } : item));
      setCollapsed((ids) => ids.filter((id) => id !== moduleId));
      toast(`${mod.full} verlassen`);
    }
    void reloadRooms();
  };

  const deleteChannel = async (chId: string) => {
    const target = channel(chId);
    if (!target || !auth.token) return;
    try {
      await chatApi.deleteChat(auth.token, target.chatid);
      setChannels((cs) => cs.filter((c) => c.id !== chId));
      toast(`${target.name} gelöscht`);
      back();
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  /**
   * Allows any user to create a brand-new Module (Course) on the server!
   * Creates the Module entry and immediately creates its `WS26:MOD:<Slug>:MAIN` room via `createchat`.
   */
  const createModule = async (
    shortName: string,
    fullName: string,
    codeInput: string,
    profInput: string,
    category: string,
  ): Promise<string | undefined> => {
    if (!auth.token) return undefined;
    const shortClean = shortName.trim().slice(0, 14);
    const fullClean = fullName.trim() || shortClean;
    const slug = slugifyName(shortClean);
    const words = shortClean.split(/\s+/).filter(Boolean);
    const abbr =
      words.length >= 2
        ? `${words[0]![0]}${words[1]![0]}`.toUpperCase()
        : shortClean.slice(0, 2).toUpperCase();

    const newMod: Module = {
      id: `mod_${slug.toLowerCase()}`,
      slug,
      abbr,
      short: shortClean,
      full: fullClean,
      code: codeInput.trim() || `MOD-${abbr}`,
      prof: profInput.trim() || displayName,
      participants: 1,
      category: category || CATEGORIES[0]!,
      joined: true,
    };

    const rawName = buildModuleMainRoomName(newMod);
    try {
      const res = await chatApi.createChat(auth.token, rawName, true);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);

      setModules((prev) => {
        const exists = prev.some((m) => m.id === newMod.id);
        return exists
          ? prev.map((m) => (m.id === newMod.id ? { ...m, joined: true } : m))
          : [...prev, newMod];
      });

      const mainChannel: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: 'Hauptkanal',
        icon: '💬',
        moduleId: newMod.id,
        members: 1,
        visibility: 'public',
        messages: [],
      };
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), mainChannel]);
      setActiveChannelId(newId);
      setModuleModalOpen(false);
      markOb(1);
      toast(`Modul „${newMod.short}“ angelegt`);
      reloadRooms();
      return newId;
    } catch (e) {
      toast(formatError(e));
      return undefined;
    }
  };

  const createSubgroup = async (moduleId: string, name: string, type: string): Promise<string | undefined> => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || !auth.token) return undefined;
    const rawName = buildSubgroupRoomName(mod, name);
    try {
      const res = await chatApi.createChat(auth.token, rawName, true);
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
        visibility: 'public',
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
      const res = await chatApi.createChat(auth.token, rawName, true);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);
      const optimistic: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: name.trim(),
        icon,
        members: 1,
        visibility: 'public',
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
            const list = profRes.profiles ?? [];
            setProfiles(list);
            for (const targetUid of invitees) {
              const found = list.find(
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
    const module = modules.find((item) => item.id === id);
    const token = auth.token;
    if (!module || !token) return;
    try {
      const { chats } = await chatApi.getChats(token);
      if (getServerMode() !== serverMode) return;
      const main = chats.find((room) => {
        const parsed = parseChatRoom(room, [], modules);
        return parsed.moduleId === id && parsed.name === 'Hauptkanal';
      });
      let chatId: number;
      if (main) {
        if (!isRoomJoined(main)) {
          await chatApi.joinChat(token, main.chatid);
        }
        chatId = main.chatid;
      } else {
        const res = await chatApi.createChat(token, buildModuleMainRoomName(module), true);
        chatId = Number(res.chatid);
      }
      if (getServerMode() !== serverMode) return;
      const rooms = await reloadRooms();
      if (!rooms || getServerMode() !== serverMode) return;
      const joinedMain = rooms.find((room) =>
        room.id === String(chatId) && room.moduleId === id && room.name === 'Hauptkanal',
      );
      if (!joinedMain) {
        toast('Hauptkanal konnte nicht geladen werden. Bitte erneut versuchen.');
        return;
      }
      setModules((items) => items.map((item) => item.id === id ? { ...item, joined: true } : item));
      setCollapsed((ids) => ids.filter((item) => item !== id));
      setActiveChannelId(joinedMain.id);
      navigate('chat');
      markOb(1);
      toast(`${module.full} beigetreten`);
    } catch (e) {
      toast(formatError(e));
    }
  };

  const joinRoomById = async (targetChatId: number): Promise<boolean> => {
    if (!auth.token) return false;
    try {
      await chatApi.joinChat(auth.token, targetChatId);
      await reloadRooms();
      setActiveChannelId(String(targetChatId));
      toast(`Raum #${targetChatId} beigetreten`);
      return true;
    } catch (e) {
      toast(formatError(e));
      return false;
    }
  };

  // ── Members & Invitations (getprofiles, invite, getinvites, joinchat, rejectinvite) ──
  const inviteState = (chId: string): InviteState => {
    if (inviteMap[chId]) return inviteMap[chId];
    const ch = channel(chId);
    const dynamicSenders = Array.from(
      new Set(
        (ch?.messages ?? [])
          .map((m) => m.senderId)
          .filter(
            (uid): uid is string =>
              typeof uid === 'string' && uid.toLowerCase() !== auth.userId.toLowerCase(),
          ),
      ),
    );
    const defaultMembers: Member[] = [
      { id: 'self', role: 'Ersteller' },
      ...dynamicSenders.map((uid) => ({ id: uid, role: 'Mitglied' })),
    ];
    if (isMockModeEnabled() && defaultMembers.length === 1) {
      defaultMembers.push({ id: 'abcdit09', role: 'Mitglied' });
    }
    return {
      pending: isMockModeEnabled() ? ['abcdit44'] : [],
      members: defaultMembers,
    };
  };

  const updateInvite = (chId: string, fn: (s: InviteState) => InviteState) =>
    setInviteMap((m) => ({ ...m, [chId]: fn(m[chId] ?? inviteState(chId)) }));

  const sendInvite = async (chId: string, targetUser: string): Promise<string | null> => {
    const cleanUser = targetUser.trim().toLowerCase();
    const targetChannel = channel(chId) ?? activeChannel;
    if (!auth.token) return 'Nicht angemeldet';

    try {
      const profRes = await chatApi.getProfiles(auth.token);
      const list = profRes.profiles ?? [];
      setProfiles(list);
      const found = list.find((p) => p.userid.toLowerCase() === cleanUser);

      if (!found && !isMockModeEnabled()) {
        const msg = `Nutzer „${cleanUser}“ ist noch nicht auf dem Server registriert.`;
        toast(msg);
        return msg;
      }

      if (found) {
        await chatApi.invite(auth.token, targetChannel.chatid, found.hash);
      }

      updateInvite(chId, (s) => ({
        ...s,
        pending: s.pending.includes(cleanUser) ? s.pending : [...s.pending, cleanUser],
      }));
      markOb(3);
      toast(`Einladung an ${cleanUser} gesendet`);
      return null;
    } catch (e) {
      const errMsg = formatError(e);
      toast(errMsg);
      return errMsg;
    }
  };

  const withdrawInvite = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, pending: s.pending.filter((p) => p !== user) }));
    toast('Einladung zurückgezogen');
  };

  const removeMember = (chId: string, user: string) => {
    updateInvite(chId, (s) => ({ ...s, members: s.members.filter((p) => p.id !== user) }));
    toast(`${user} entfernt`);
  };

  const respondInvitation = async (id: string, accept: boolean) => {
    const inv = invitations.find((i) => i.id === id);
    if (!inv || !auth.token) return;

    setInvitations((is) =>
      is.map((i) =>
        i.id === id
          ? { ...i, status: accept ? 'accepted' : 'rejected', when: 'gerade eben' }
          : i,
      ),
    );

    try {
      if (accept) {
        await chatApi.joinChat(auth.token, inv.chatid);
        await reloadRooms();
        toast(`${inv.channelName} beigetreten`);
      } else {
        await chatApi.rejectInvite(auth.token, inv.chatid);
        toast('Einladung abgelehnt');
      }
    } catch (e) {
      toast(formatError(e));
    }
  };

  // ── Notifications ──
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
    // Auth & Backend Mode
    ...auth,
    serverMode,
    setServerMode,
    mockMode,
    setMockMode,
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
    profiles,
    loadingRooms,
    reloadRooms,
    channel,
    moduleOf,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    openChannel,
    moduleMainChannel,
    openModuleMain,
    leaveChannel,
    leaveModule,
    deleteChannel,
    createModule,
    createSubgroup,
    createCustomGroup,
    joinModule,
    joinRoomById,

    // Messages & Attachments
    typing,
    setTyping,
    chatLoadState,
    retryLoadChat,
    pendingMessages: pending.map((item) => item.message),
    sendFail,
    setSendFail,
    retryMessage,
    deleteMessage,
    sendMessage,
    attachFile,
    openFile,
    openFileState,

    // Modals, Invites, Members & Notifications
    subgroupModal,
    setSubgroupModal,
    moduleModalOpen,
    setModuleModalOpen,
    inviteState,
    sendInvite,
    withdrawInvite,
    removeMember,
    invitations,
    respondInvitation,
    notifs,
    setNotifs,
    markAllRead,
    openNotif,
    settings,
    setSettings,
    collapsed,
    toggleCollapsed,
    semesterTab,
    setSemesterTab,
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
