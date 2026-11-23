import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
  type ChannelSubtype,
  type FileAtt,
  type Invitation,
  type Module,
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
  isRoomJoinedByUser,
  parseChatInvite,
  parseChatMessage,
  parseChatRoom,
  sanitizeServerToken,
  syncModulesWithServerRooms,
} from '../utils/roomParser';

export type Dir = 'push' | 'pop' | 'fade';
export type Member = { id: string; role: string; hash?: string };
export type InviteState = { pending: string[]; members: Member[] };
export type OpenFile = { file: FileAtt; sharedBy: string; channelId: string };

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

export type FontSizeScale = '100' | '115' | '130';

export interface AppSettings {
  highContrast: boolean;
  fontSizeScale: FontSizeScale;
  showTabLabels: boolean;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  highContrast: false,
  fontSizeScale: '100',
  showTabLabels: true,
  reducedMotion:
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
};

function useAppState() {
  const auth = useAuth();
  const [serverMode, setServerModeState] = useState<ServerMode>(() => getServerMode());
  const mockMode = serverMode === 'mock';
  const [stack, setStack] = useState<ScreenId[]>(['splash']);
  const [dir, setDir] = useState<Dir>('fade');
  const [navKey, setNavKey] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null);

  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('displayName') ?? (isMockModeEnabled() ? 'Max Mustermann' : auth.userId || 'Studierender'),
  );
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
    INITIAL_MODULES.map((m) => ({
      ...m,
      participants: isMockModeEnabled() ? m.participants : 0,
      joined: isMockModeEnabled() ? m.joined : false,
    })),
  );
  const [channels, setChannels] = useState<Channel[]>([]);
  const [serverRooms, setServerRooms] = useState<import('../types').ChatRoom[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeChannelId, setActiveChannelIdState] = useState<string>('0');
  const activeChannelIdRef = useRef<string>('0');
  const setActiveChannelId = useCallback((id: string) => {
    activeChannelIdRef.current = id;
    setActiveChannelIdState(id);
  }, []);
  const localChannelsRef = useRef<Map<string, Channel>>(new Map());
  const localModulesRef = useRef<Map<string, Module>>(new Map());
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
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('hey_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('hey_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);
  // AC 1: Modules are initially collapsed by default (only active module or none open)
  const [collapsed, setCollapsed] = useState<string[]>(() =>
    INITIAL_MODULES.filter((m) => m.id !== 'mathe1').map((m) => m.id),
  );
  const [accordionMode, setAccordionMode] = useState<boolean>(false);

  const toggleCollapsed = (id: string, forceAccordion?: boolean) => {
    setCollapsed((prev) => {
      const isClosed = prev.includes(id);
      const useAccordion = forceAccordion !== undefined ? forceAccordion : accordionMode;
      if (isClosed) {
        if (useAccordion) {
          const allOtherModuleIds = modules.map((m) => m.id).filter((mId) => mId !== id);
          return [...new Set([...allOtherModuleIds, 'custom', 'archive'])];
        }
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const collapseAll = () => {
    setCollapsed([...modules.map((m) => m.id), 'custom', 'archive']);
  };

  const expandAll = () => {
    setCollapsed([]);
  };

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
    localChannelsRef.current.clear();
    localModulesRef.current.clear();
    setChannels([]);
    setServerRooms([]);
    setInviteMap({});
    setInvitations(useMock ? MOCK_ARCHIVED_INVITATIONS : []);
    setNotifs(useMock ? MOCK_INITIAL_NOTIFS : []);
    setModules(
      INITIAL_MODULES.map((m) => ({
        ...m,
        participants: useMock ? m.participants : 0,
        joined: useMock ? m.joined : false,
      })),
    );
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
  const reloadRooms = useCallback(async () => {
    if (!auth.token || !auth.isSessionReady) return;
    setLoadingRooms(true);
    try {
      const [chatsRes, invitesRes, profilesRes] = await Promise.all([
        chatApi.getChats(auth.token),
        chatApi.getInvites(auth.token).catch(() => ({ invites: [] })),
        chatApi.getProfiles(auth.token).catch(() => ({ profiles: [] })),
      ]);

      const rawRooms = (chatsRes.chats ?? []).map((r) => ({
        ...r,
        chatid: Number(r.chatid),
      }));
      setServerRooms(rawRooms);
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
      const baseMods = [
        ...INITIAL_MODULES,
        ...Array.from(localModulesRef.current.values()).filter(
          (lm) => !INITIAL_MODULES.some((im) => im.id === lm.id),
        ),
      ];
      const syncedMods = syncModulesWithServerRooms(
        rawRooms,
        baseMods,
        isMockModeEnabled(),
        auth.userId,
      ).map((m) => {
        const localMod = localModulesRef.current.get(m.id);
        if (localMod && localMod.joined) {
          return {
            ...m,
            short: localMod.short || m.short,
            full: localMod.full || m.full,
            code: localMod.code || m.code,
            prof: localMod.prof || m.prof,
            category: localMod.category || m.category,
            joined: true,
            participants: Math.max(1, m.participants, localMod.participants),
          };
        }
        return m;
      });
      setModules(syncedMods);

      setChannels((prev) => {
        const msgMap = new Map(prev.map((c) => [c.id, c.messages]));
        const joinedRooms = rawRooms.filter(
          (r) =>
            isRoomJoinedByUser(r, auth.userId) ||
            localChannelsRef.current.has(String(r.chatid)),
        );
        const parsed = joinedRooms.map((r) =>
          parseChatRoom(r, msgMap.get(String(r.chatid)) ?? [], syncedMods),
        );
        // Preserve locally created/joined channels even if the server's getchats response is delayed or omits them initially
        for (const [localId, localCh] of localChannelsRef.current.entries()) {
          if (!parsed.some((c) => c.id === localId)) {
            parsed.push({
              ...localCh,
              messages: msgMap.get(localId) ?? localCh.messages,
            });
          }
        }
        // Ensure Main Chat (#0) is always available as a real room on Live and Backup servers
        if (!isMockModeEnabled() && !parsed.some((c) => c.chatid === 0)) {
          parsed.unshift({
            id: '0',
            chatid: 0,
            rawName: 'Hauptchat (#0)',
            name: 'Hauptchat (#0)',
            icon: '💬',
            subtype: 'custom',
            members: Math.max(1, fetchedProfiles.length),
            visibility: 'public',
            messages: msgMap.get('0') ?? [],
          });
        }
        // Use activeChannelIdRef.current to avoid stale closure overwriting newly selected room!
        const currentActiveId = activeChannelIdRef.current;
        if (parsed.length > 0 && !parsed.some((c) => c.id === currentActiveId)) {
          setActiveChannelId(parsed[0]!.id);
        }
        return parsed;
      });

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
    } catch (e) {
      toast(formatError(e));
    } finally {
      setLoadingRooms(false);
    }
  }, [auth.token, auth.isSessionReady, auth.userId, setActiveChannelId, toast]);

  useEffect(() => {
    if (auth.token && auth.isSessionReady) {
      reloadRooms();
    } else if (!auth.token) {
      setChannels([]);
      setInvitations(isMockModeEnabled() ? MOCK_ARCHIVED_INVITATIONS : []);
    }
  }, [auth.token, auth.isSessionReady, serverMode, reloadRooms]);

  const channel = (id: string) => channels.find((c) => c.id === id);
  const moduleOf = (c?: Channel) => modules.find((m) => m.id === c?.moduleId);
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
  const pollMessagesNow = useRef<() => Promise<void>>(async () => {});
  const activeChatId = activeChannel.chatid;

  useEffect(() => {
    if (!auth.token || !auth.isSessionReady) return;
    const targetChatId = activeChatId;
    const targetIdStr = String(targetChatId);
    let lastId = 0;
    let cancelled = false;

    const poll = async () => {
      if (!auth.token || !auth.isSessionReady) return;
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
        // Ignore transient polling errors
      }
    };

    pollMessagesNow.current = poll;
    poll();

    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auth.token, auth.isSessionReady, auth.userId, activeChatId]);

  const archivedChatId = channels.find((c) => c.archived)?.chatid;

  useEffect(() => {
    if (screen !== 'archive' || !auth.token || !auth.isSessionReady || archivedChatId === undefined) return;
    const archIdStr = String(archivedChatId);
    chatApi
      .getMessages(auth.token, archivedChatId, 0)
      .then((res) => {
        const parsed = (res.messages ?? []).map((m) =>
          parseChatMessage(m, auth.userId, auth.token ?? undefined),
        );
        setChannels((prev) =>
          prev.map((c) => (c.id === archIdStr ? { ...c, messages: parsed } : c)),
        );
      })
      .catch(() => {});
  }, [screen, auth.token, auth.isSessionReady, auth.userId, archivedChatId]);

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
        const n = target.messages.filter((m) => m.file && m.from === 'self').length + 1;
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

  // ── Room, Module & Subgroup creation / joining / leaving connected to chatApi ──
  const openChannel = (chId: string, push = true) => {
    setActiveChannelId(chId);
    const c = channel(chId);
    if (c?.moduleId) {
      setCollapsed((prev) => prev.filter((id) => id !== c.moduleId));
    }
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
      localChannelsRef.current.delete(chId);
      if (target.moduleId && target.subtype === 'main') {
        localModulesRef.current.delete(target.moduleId);
      }
      setChannels((cs) => cs.filter((c) => c.id !== chId));
      toast(`${target.name} verlassen`);
      back();
      reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const deleteChannel = async (chId: string) => {
    const target = channel(chId);
    if (!target || !auth.token) return;
    try {
      await chatApi.deleteChat(auth.token, target.chatid);
      localChannelsRef.current.delete(chId);
      if (target.moduleId && target.subtype === 'main') {
        localModulesRef.current.delete(target.moduleId);
      }
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
   * Creates the Module entry and immediately creates its `WS26_MOD_<Slug>_MAIN` room via `createchat`.
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
    const slug = sanitizeServerToken(shortClean) || slugifyName(shortClean);
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
      const res = await chatApi.createChat(auth.token, rawName);
      const newChatId = Number(res.chatid);
      if (!res.chatid && res.chatid !== 0) {
        throw new Error('Server hat keine gültige Chat-ID für das neue Modul zurückgegeben.');
      }
      const newId = String(newChatId);

      localModulesRef.current.set(newMod.id, newMod);
      setModules((prev) => {
        const exists = prev.some((m) => m.id === newMod.id);
        return exists
          ? prev.map((m) => (m.id === newMod.id ? { ...m, joined: true, participants: Math.max(1, m.participants) } : m))
          : [...prev, newMod];
      });
      setCollapsed((prev) => prev.filter((x) => x !== newMod.id));

      const mainChannel: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: 'Hauptkanal',
        icon: '💬',
        moduleId: newMod.id,
        subtype: 'main',
        members: 1,
        visibility: 'public',
        messages: [],
      };
      localChannelsRef.current.set(newId, mainChannel);
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), mainChannel]);
      setActiveChannelId(newId);
      setModuleModalOpen(false);
      markOb(1);
      toast(`Modul „${newMod.short}“ angelegt (#${newChatId})`);
      await reloadRooms();
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
      const res = await chatApi.createChat(auth.token, rawName);
      const newChatId = Number(res.chatid);
      const newId = String(newChatId);
      const subtype: ChannelSubtype =
        type === 'Übungsblatt' ? 'exercise' : type === 'Projekt' ? 'project' : 'study';
      const optimistic: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: name.trim(),
        icon: '💬',
        moduleId,
        subtype,
        members: 1,
        visibility: 'public',
        messages: [],
      };
      localChannelsRef.current.set(newId, optimistic);
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), optimistic]);
      setActiveChannelId(newId);
      setSubgroupModal(null);
      markOb(2);
      toast(`${type} „${name.trim()}“ erstellt (#${newChatId})`);
      await reloadRooms();
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
      const res = await chatApi.createChat(auth.token, rawName);
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
      localChannelsRef.current.set(newId, optimistic);
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
      await reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const joinModule = async (id: string) => {
    const m = modules.find((x) => x.id === id);
    if (!m || !auth.token) return;

    const existingMain = channels.find(
      (c) =>
        !c.archived &&
        c.moduleId === id &&
        (c.subtype === 'main' ||
          c.name === 'Hauptkanal' ||
          /[:_]MAIN$/i.test(c.rawName)),
    );

    if (existingMain) {
      localModulesRef.current.set(id, { ...m, joined: true });
      setModules((ms) => ms.map((x) => (x.id === id ? { ...x, joined: true } : x)));
      setCollapsed((prev) => prev.filter((x) => x !== id));
      setActiveChannelId(existingMain.id);
      markOb(1);
      toast(`${m.full} geöffnet`);
      if (screen !== 'chat') {
        navigate('chat');
      }
      return;
    }

    try {
      // Fetch latest server rooms to check if this module's main room already exists as a public chat
      let latestRooms = serverRooms;
      try {
        const chatsRes = await chatApi.getChats(auth.token);
        latestRooms = (chatsRes.chats ?? []).map((r) => ({ ...r, chatid: Number(r.chatid) }));
        setServerRooms(latestRooms);
      } catch {
        // fall back to cached serverRooms
      }

      const existingServerRoom = latestRooms.find((r) => {
        const parsed = parseChatRoom(r, [], modules);
        return !parsed.archived && parsed.moduleId === id && parsed.subtype === 'main';
      });

      let newChatId: number;
      let rawName: string;

      if (existingServerRoom) {
        newChatId = Number(existingServerRoom.chatid);
        rawName = String(existingServerRoom.chatname);
        if (!isRoomJoinedByUser(existingServerRoom, auth.userId)) {
          await chatApi.joinChat(auth.token, newChatId);
        }
      } else {
        rawName = buildModuleMainRoomName(m);
        const res = await chatApi.createChat(auth.token, rawName);
        newChatId = Number(res.chatid);
      }

      const newId = String(newChatId);
      const joinedMod: Module = {
        ...m,
        joined: true,
        participants: Math.max(1, m.participants + 1),
      };
      localModulesRef.current.set(id, joinedMod);
      setModules((ms) => ms.map((x) => (x.id === id ? joinedMod : x)));
      setCollapsed((prev) => prev.filter((x) => x !== id));

      const joinedChannel: Channel = {
        id: newId,
        chatid: newChatId,
        rawName,
        name: 'Hauptkanal',
        icon: '💬',
        moduleId: id,
        subtype: 'main',
        members: Math.max(1, m.participants + 1),
        visibility: 'public',
        messages: [],
      };
      localChannelsRef.current.set(newId, joinedChannel);
      setChannels((cs) => [...cs.filter((c) => c.id !== newId), joinedChannel]);
      setActiveChannelId(newId);
      markOb(1);
      toast(`${m.full} beigetreten (#${newChatId})`);
      if (screen !== 'chat') {
        navigate('chat');
      }
      await reloadRooms();
    } catch (e) {
      toast(formatError(e));
    }
  };

  const openModuleMain = (moduleId: string) => {
    setCollapsed((prev) => prev.filter((id) => id !== moduleId));
    const mainCh = channels.find(
      (c) =>
        !c.archived &&
        c.moduleId === moduleId &&
        (c.subtype === 'main' ||
          c.name.toLowerCase() === 'hauptkanal' ||
          /[:_]MAIN$/i.test(c.rawName)),
    );
    if (mainCh) {
      setActiveChannelId(mainCh.id);
      navigate('chat');
    } else {
      const anyCh = channels.find((c) => !c.archived && c.moduleId === moduleId);
      if (anyCh) {
        setActiveChannelId(anyCh.id);
        navigate('chat');
      } else {
        joinModule(moduleId);
      }
    }
  };

  const joinRoomById = async (targetChatId: number): Promise<boolean> => {
    if (!auth.token) return false;
    try {
      await chatApi.joinChat(auth.token, targetChatId);
      const idStr = String(targetChatId);
      setActiveChannelId(idStr);
      await reloadRooms();
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
    const rawRoom = serverRooms.find((r) => String(r.chatid) === chId);

    if (!isMockModeEnabled() && rawRoom) {
      const ownerObj =
        rawRoom.owner && !Array.isArray(rawRoom.owner) ? rawRoom.owner : undefined;
      const serverParticipants = Array.isArray(rawRoom.participants) ? rawRoom.participants : [];
      const serverInvited = Array.isArray(rawRoom.invited) ? rawRoom.invited : [];

      const members: Member[] = [];
      const seenIds = new Set<string>();

      for (const p of serverParticipants) {
        const isMe = p.userid.toLowerCase() === auth.userId.toLowerCase();
        const isOwner = ownerObj?.userid?.toLowerCase() === p.userid.toLowerCase();
        const memberId = isMe ? 'self' : p.userid;
        if (!seenIds.has(memberId.toLowerCase())) {
          seenIds.add(memberId.toLowerCase());
          members.push({
            id: memberId,
            role: isOwner ? 'Ersteller' : 'Mitglied',
            hash: p.hash,
          });
        }
      }

      if (!seenIds.has('self')) {
        const isOwner =
          ownerObj?.userid?.toLowerCase() === auth.userId.toLowerCase() || rawRoom.role === 'owner';
        members.unshift({ id: 'self', role: isOwner ? 'Ersteller' : 'Mitglied' });
      }

      const pending = serverInvited.map((inv) => inv.userid.toLowerCase());
      return { pending, members };
    }

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
      { id: 'self', role: ch?.chatid === 0 ? 'Mitglied' : 'Ersteller' },
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
    leaveChannel,
    deleteChannel,
    createModule,
    createSubgroup,
    createCustomGroup,
    joinModule,
    openModuleMain,
    joinRoomById,

    // Messages & Attachments
    typing,
    setTyping,
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
    collapseAll,
    expandAll,
    accordionMode,
    setAccordionMode,
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
